
--
-- lua-mqtt : <https://fperrad.frama.io/lua-mqtt/>
--

if _VERSION < 'Lua 5.3' then
    require'compat53'
    if _VERSION == 'Lua 5.1' then
        require'bit'
    end
end

local error = error
local pcall = pcall
local setmetatable = setmetatable
local tostring = tostring
local type = type
local random = math.random
local math_type = math.type
local byte = string.byte
local char = string.char
local format = string.format
local len = string.len
local pack = string.pack
local sub = string.sub
local unpack = string.unpack
local concat = table.concat
local insert = table.insert
local remove = table.remove
local utf8_codes = utf8.codes
local utf8_len = utf8.len

if _VERSION <= 'Lua 5.3' then
    math.randomseed(os.time())
end

local _ENV = _ENV
if _VERSION >= 'Lua 5.3' then
    _ENV = nil
end

local mt = {}

local function argerror(caller, narg, extramsg, level)
    error("bad argument #" .. tostring(narg) .. " to '"
          .. caller .. "' (" .. extramsg .. ")", level + 2)
end

local function typeerror (caller, narg, arg, tname, level)
    level = level or 1
    local got = (arg == nil) and 'no value' or type(arg)
    argerror(caller, narg, tname .. " expected, got " .. got, level + 1)
end

local function valid_socket (o)
    local status, result = pcall(function ()
        return o and o.close and o.read and o.write
    end)
    return status and result
end

local function valid_logger (o)
    local status, result = pcall(function ()
        return o and o.error and o.debug
    end)
    return status and result
end

local function valid_topic_name (s, lax)
    if #s == 0 or #s > 0xFFFF then
        return false
    end
    if not utf8_len(s) then
        return false
    end
    local first = true
    for _, c in utf8_codes(s) do
        if c >= 0x0000 and c <= 0x001F then
            return false
        end
        if c >= 0x007F and c <= 0x009F then
            return false
        end
        if c >= 0xD800 and c <= 0xDFFF then
            return false
        end
        if c == 35 or c == 43 then              -- # +
            return false
        end
        if first then
            if c == 36 and not lax then         -- $
                return false
            end
            first = false
        end
    end
    return true
end

local function valid_topic_filter (s)
    if #s == 0 or #s > 0xFFFF then
        return false
    end
    if not utf8_len(s) then
        return false
    end
    local start = true
    local seen
    for p, c in utf8_codes(s) do
        if c >= 0x0000 and c <= 0x001F then
            return false
        end
        if c >= 0x007F and c <= 0x009F then
            return false
        end
        if c >= 0xD800 and c <= 0xDFFF then
            return false
        end
        if (c == 35 or c == 43) and not start then
            return false
        end
        if c == 35 and p ~= #s then             -- #
            return false
        end
        if c ~= 47 and seen then
            return false
        end
        start = c == 47                         -- /
        seen = c == 43                          -- +
    end
    return true
end

local function encode_vbi (n)
    if n < 0x80 then
        return char(n)
    else
        local t = {}
        repeat
            local b = n % 0x80
            n = n // 0x80
            if n > 0 then
                b = b + 0x80
            end
            t[#t+1] = char(b)
        until n == 0
        return concat(t)
    end
end

local function cook (fixed_header, variable_header, payload)
    variable_header = variable_header or ''
    payload = payload or ''
    local rem_len = len(variable_header) + len(payload)
    return char(fixed_header) .. encode_vbi(rem_len) .. variable_header .. payload
end

local function compute_id (id)
    if id then
        id = id + 1
        if id <= 0xFFFF then
            return id
        end
    end
    return random(0x0100, 0xFFFF)
end

local function next_id (queue, id)
    while true do
        id = compute_id(id)
        local found
        for i = 1, #queue do
            if queue[i] == id then
                found = true
                break
            end
        end
        if not found then
            return id
        end
        id = nil
    end
end

local function remove_id (queue, id)
    local found
    repeat
        found = false
        local nb = #queue
        local last = 0
        for i = 1, #queue do
            last = i
            if queue[i] == id then
                remove(queue, i)
                found = true
                break
            end
        end
    until found or nb == last
end

function mt._mk_connect (flags, keep_alive, client_id, will_topic, will_message, username, password)
    local payload = pack('>s2', client_id)
    if will_topic and will_message then
        payload = payload .. pack('>s2s2', will_topic, will_message)
    end
    if username then
        payload = payload .. pack('>s2', username)
    end
    if password then
        payload = payload .. pack('>s2', password)
    end
    return cook(0x10, pack('>s2I1I1I2', 'MQTT', 4, flags, keep_alive), payload)
end

function mt:_send_connect (flags, keep_alive, client_id, will_topic, will_message, username, password)
    if self.logger then
        self.logger:debug('MQTT> CONNECT ' .. tostring(keep_alive) .. ' ' .. client_id)
        if will_topic and will_message then
            self.logger:debug('MQTT> Will ' .. will_topic)
        end
    end
    self.connect_sent = true
    self.connack_received = false
    return self.socket:write(self._mk_connect(flags, keep_alive, client_id, will_topic, will_message, username, password))
end

-- connack

function mt._mk_publish (flags, id, topic, payload)
    return cook(0x30 | flags, id and pack('>s2I2', topic, id) or pack('>s2', topic), payload)
end

function mt:_send_publish (flags, id, topic, payload)
    if self.logger then
        if id then
            self.logger:debug('MQTT> PUBLISH ' .. tostring(id) .. ' ' .. topic)
        else
            self.logger:debug('MQTT> PUBLISH ' .. topic)
        end
    end
    return self.socket:write(self._mk_publish(flags, id, topic, payload))
end

function mt._mk_puback (id)
    return cook(0x40, pack('>I2', id))
end

function mt:_send_puback (id)
    if self.logger then
        self.logger:debug('MQTT> PUBACK ' .. tostring(id))
    end
    return self.socket:write(self._mk_puback(id))
end

function mt._mk_pubrec (id)
    return cook(0x50, pack('>I2', id))
end

function mt:_send_pubrec (id)
    if self.logger then
        self.logger:debug('MQTT> PUBREC ' .. tostring(id))
    end
    return self.socket:write(self._mk_pubrec(id))
end

function mt._mk_pubrel (id)
    return cook(0x62, pack('>I2', id))
end

function mt:_send_pubrel (id)
    if self.logger then
        self.logger:debug('MQTT> PUBREL ' .. tostring(id))
    end
    return self.socket:write(self._mk_pubrel(id))
end

function mt._mk_pubcomp (id)
    return cook(0x70, pack('>I2', id))
end

function mt:_send_pubcomp (id)
    if self.logger then
        self.logger:debug('MQTT> PUBCOMP ' .. tostring(id))
    end
    return self.socket:write(self._mk_pubcomp(id))
end

function mt._mk_subscribe (id, list)
    local t = {}
    for i = 1, #list, 2 do
        t[#t+1] = pack('>s2I1', list[i], list[i+1])
    end
    return cook(0x82, pack('>I2', id), concat(t))
end

function mt:_send_subscribe (id, list)
    if self.logger then
        local t = {}
        for i = 1, #list do
            t[#t+1] = tostring(list[i])
        end
        self.logger:debug('MQTT> SUBSCRIBE ' .. tostring(id) .. ' ' .. concat(t, ' '))
    end
    return self.socket:write(self._mk_subscribe(id, list))
end

-- suback

function mt._mk_unsubscribe (id, list)
    local t = {}
    for i = 1, #list do
        t[#t+1] = pack('>s2', list[i])
    end
    return cook(0xA2, pack('>I2', id), concat(t))
end

function mt:_send_unsubscribe (id, list)
    if self.logger then
        self.logger:debug('MQTT> UNSUBSCRIBE ' .. tostring(id) .. ' ' .. concat(list, ' '))
    end
    return self.socket:write(self._mk_unsubscribe(id, list))
end

-- unsuback

function mt._mk_pingreq ()
    return cook(0xC0)
end

function mt:_send_pingreq ()
    if self.logger then
        self.logger:debug('MQTT> PINGREQ')
    end
    return self.socket:write(self._mk_pingreq())
end

-- pingresp

function mt._mk_disconnect ()
    return cook(0xE0)
end

function mt:_send_disconnect ()
    if self.logger then
        self.logger:debug('MQTT> DISCONNECT')
    end
    return self.socket:write(self._mk_disconnect())
end

local function new_session ()
    return {
        queue       = {},
        rqueue      = {},
        ptype       = {},
        publish     = {},
        pubrec      = {},
        pubrel      = {},
        subscribe   = {},
        unsubscribe = {},
    }
end

local valid_qos = {
    [0] = true,
    [1] = true,
    [2] = true,
}

function mt:connect (options)
    if self.connect_sent then
        error("CONNECT already sent")
    end
    options = options or {}
    if type(options) ~= 'table' then
        typeerror('connect', 1, options, 'table')
    end
    local keep_alive = options.keep_alive or 0
    if math_type(keep_alive) ~= 'integer' or keep_alive < 0 or keep_alive > 0xFFFF then
        error("invalid Keep Alive (" .. tostring(keep_alive) .. ") in table to 'connect'")
    end
    local username = options.username
    if username and type(username) ~= 'string' then
        error("invalid User Name (" .. tostring(username) .. ") in table to 'connect'")
    end
    local password = options.password
    if password and type(password) ~= 'string' then
        error("invalid Password (" .. tostring(password) .. ") in table to 'connect'")
    end
    if password and not username then
        error("Password without User Name in table to 'connect'")
    end
    local will = options.will or {}
    if type(will) ~= 'table' then
        error("invalid Will (" .. tostring(will) .. ") in table to 'connect'")
    end
    local flags = 0

    local client_id = options.id
    if client_id and type(client_id) ~= 'string' then
        error("invalid Client Identifier (" .. tostring(client_id) .. ") in table to 'connect'")
    end
    if options.clean then
        flags = flags | 0x02            -- Clean Session
        client_id = client_id or format('LuaMQTT%08x', random(0, 0x7FFFFFFF))
    else
        if not client_id then
            error("missing Client Identifier in table to 'connect'")
        end
        if client_id == '' then
            error("empty Client Identifier in table to 'connect'")
        end
    end

    local will_topic = will[1]
    local will_message = will[2]
    local will_qos = will.qos or 0
    if will_topic and will_message then
        if type(will_topic) ~= 'string' or not valid_topic_name(will_topic) then
            error("invalid Will Topic (" .. tostring(will_topic) .. ") in table to 'connect'")
        end
        if type(will_message) ~= 'string' then
            error("invalid Will Message (" .. tostring(will_message) .. ") in table to 'connect'")
        end
        if not valid_qos[will_qos] then
            error("invalid Will QoS (" .. tostring(will_qos) .. ") in table to 'connect'")
        end
        flags = flags | 0x04            -- Will flag
        flags = flags | (will_qos << 3) -- Will QoS
        if will.retain then
            flags = flags | 0x20        -- Will Retain
        end
    end
    if username then
        flags = flags | 0x80            -- User Name Flag
        if password then
            flags = flags | 0x40        -- Password Flag
        end
    end
    local res, msg = self:_send_connect(flags, keep_alive, client_id, will_topic, will_message, username, password)
    if res then
        self.clean = options.clean
        self.keep_alive = keep_alive
        self.id = client_id
        self.will = will
        self.password = password
        self.username = username
    end
    return res, msg
end

function mt:reconnect (socket)
    if not self.connect_sent then
        error("CONNECT not sent")
    end
    if not socket or not valid_socket(socket) then
        typeerror('reconnect', 1, socket, 'socket')
    end
    self.socket = socket
    local will = self.will
    local username = self.username
    local password = self.password
    local flags = 0
    if self.clean then
        flags = flags | 0x02            -- Clean Session
        self.session = new_session()
    end
    local will_topic = will[1]
    local will_message = will[2]
    local will_qos = will.qos or 0
    if will_topic and will_message then
        flags = flags | 0x04            -- Will flag
        flags = flags | (will_qos << 3) -- Will QoS
        if will.retain then
            flags = flags | 0x20        -- Will Retain
        end
    end
    if username then
        flags = flags | 0x80            -- User Name Flag
        if password then
            flags = flags | 0x40        -- Password Flag
        end
    end
    return self:_send_connect(flags, self.keep_alive, self.id, will_topic, will_message, username, password)
end

function mt:publish (topic, payload, options)
    if not self.connect_sent then
        error("CONNECT not sent")
    end
    if type(topic) ~= 'string' then
        typeerror('match', 1, topic, 'string')
    end
    if not valid_topic_name(topic) then
        error("invalid Topic Name to 'publish'")
    end
    if type(payload) ~= 'string' then
        typeerror('publish', 2, payload, 'string')
    end
    options = options or {}
    if type(options) ~= 'table' then
        typeerror('publish', 3, options, 'table')
    end
    local qos = options.qos or 0
    if not valid_qos[qos] then
        error("invalid QoS (" .. tostring(qos) .. ") in table to 'publish'")
    end

    local flags = (qos << 1) | (options.retain and 0x1 or 0x0)
    local id
    if qos > 0 then
        local session = self.session
        id = next_id(session.queue, session.pid)
        session.pid = id
        insert(session.queue, id)
        session.ptype[id] = 'publish'
        session.publish[id] = { topic, payload, options }
    end
    return self:_send_publish(flags, id, topic, payload)
end

function mt:subscribe (list)
    if not self.connect_sent then
        error("CONNECT not sent")
    end
    if type(list) ~= 'table' then
        typeerror('subscribe', 1, list, 'table')
    end
    if #list == 0 then
        error("empty table for 'subscribe'")
    end
    for i = 1, #list, 2 do
        local filter, qos = list[i], list[i+1]
        if type(filter) ~= 'string' or not valid_topic_filter(filter) then
            error("invalid Topic Filter (" .. tostring(filter) .. ") at index " .. tostring(i) .. " in table to 'subscribe'")
        end
        if not valid_qos[qos] then
            error("invalid Requested QoS (" .. tostring(qos) .. ") at index " .. tostring(i+1) .. " in table to 'subscribe'")
        end
    end

    local session = self.session
    local id = next_id(session.queue, session.pid)
    session.pid = id
    insert(session.queue, id)
    session.ptype[id] = 'subscribe'
    session.subscribe[id] = list
    return self:_send_subscribe(id, list)
end

function mt:unsubscribe (list)
    if not self.connect_sent then
        error("CONNECT not sent")
    end
    if type(list) ~= 'table' then
        typeerror('unsubscribe', 1, list, 'table')
    end
    if #list == 0 then
        error("empty table for 'unsubscribe'")
    end
    for i = 1, #list do
        local filter = list[i]
        if type(filter) ~= 'string' or not valid_topic_filter(filter) then
            error("invalid Topic Filter (" .. tostring(filter) .. ") at index " .. tostring(i) .. " in table to 'unsubscribe'")
        end
    end

    local session = self.session
    local id = next_id(session.queue, session.pid)
    session.pid = id
    insert(session.queue, id)
    session.ptype[id] = 'unsubscribe'
    session.unsubscribe[id] = list
    return self:_send_unsubscribe(id, list)
end

function mt:ping ()
    if not self.connect_sent then
        error("CONNECT not sent")
    end
    return self:_send_pingreq()
end

function mt:disconnect ()
    if not self.connect_sent then
        error("CONNECT not sent")
    end
    return self:_send_disconnect()
end

function mt:_connect (return_code, session_present)
    if self.on_connect then
        local status, msg = pcall(self.on_connect, return_code, session_present)
        if not status and self.logger then
            self.logger:error('MQTT on_connect throws --> ' .. tostring(msg))
        end
    else
        if self.logger then
            self.logger:debug('MQTT no on_connect callback')
        end
    end
end

function mt:_message (topic, payload)
    if self.on_message then
        local status, msg = pcall(self.on_message, topic, payload)
        if not status and self.logger then
            self.logger:error('MQTT on_message throws --> ' .. tostring(msg))
        end
    else
        if self.logger then
            self.logger:debug('MQTT no on_message callback')
        end
    end
end

function mt:_error (msg)
    if self.logger then
        self.logger:error('MQTT LOST_CONNECTION: ' .. tostring(msg))
    end
    if self.on_error then
        local status, result, message = pcall(self.on_error)
        if status then
            if result then
                return self:_fetch()
            else
                return nil, message
            end
        else
            if self.logger then
                self.logger:error('MQTT on_error throws --> ' .. tostring(result))
            end
            return nil, result
        end
    else
        if self.logger then
            self.logger:error('MQTT no on_error callback')
        end
        return nil, msg
    end
end

function mt:_hangup (msg)
    if self.logger then
        self.logger:error('MQTT HANGUP: ' .. msg)
    end
    local sock = self.socket
    sock:close()
    self.socket = nil
    return nil, msg
end

local valid_code_connack = {
    [0]   = true,       -- Connection Accepted
    [1]   = true,       -- Connection Refused, unacceptable protocol version
    [2]   = true,       -- Connection Refused, identifier rejected
    [3]   = true,       -- Connection Refused, Server unavailable
    [4]   = true,       -- Connection Refused, bad user name or password
    [5]   = true,       -- Connection Refused, not authorized
}

function mt:_parse_connack (s)
    local flags, rc = unpack('>I1I1', s)
    if (flags & 0xFE) ~= 0 then
        return self:_hangup(format('invalid flags in CONNACK: %02X', flags))
    end
    local sp = flags ~= 0
    if not valid_code_connack[rc] then
        return self:_hangup('invalid code in CONNACK: ' .. tostring(rc))
    end
    if sp and rc ~= 0 then
        return self:_hangup('invalid CONNACK (sp with rc)')
    end
    if self.logger then
        self.logger:debug('MQTT< CONNACK sp=' .. tostring(flags) .. ' rc=' .. tostring(rc))
    end
    return {
        type = 'CONNACK',
        sp   = sp,
        rc   = rc,
    }
end

function mt:_parse_publish (s, flags)
    local dup = (flags & 0x8) ~= 0
    local retain = (flags & 0x1) ~= 0
    local qos = (flags & 0x6) >> 1
    if qos == 0x3 then
        return self:_hangup('invalid QoS for PUBLISH')
    end
    local status, topic, id
    local pos = 1
    if qos == 0 then
        status, topic, pos = pcall(unpack, '>s2', s, pos)
    else
        status, topic, id, pos = pcall(unpack, '>s2I2', s, pos)
    end
    if not status then
        return self:_hangup('invalid message for PUBLISH: ' .. topic)
    end
    if self.logger then
        if id then
            self.logger:debug('MQTT< PUBLISH ' .. tostring(id) .. ' ' .. topic)
        else
            self.logger:debug('MQTT< PUBLISH ' .. topic)
        end
    end
    return {
        type    = 'PUBLISH',
        dup     = dup,
        retain  = retain,
        qos     = qos,
        topic   = topic,
        id      = id,
        payload = sub(s, pos),
    }
end

function mt:_parse_puback (s)
    local id = unpack('>I2', s)
    if self.logger then
        self.logger:debug('MQTT< PUBACK ' .. tostring(id))
    end
    return {
        type = 'PUBACK',
        id   = id,
    }
end

function mt:_parse_pubrec (s)
    local id = unpack('>I2', s)
    if self.logger then
        self.logger:debug('MQTT< PUBREC ' .. tostring(id))
    end
    return {
        type = 'PUBREC',
        id   = id,
    }
end

function mt:_parse_pubrel (s)
    local id = unpack('>I2', s)
    if self.logger then
        self.logger:debug('MQTT< PUBREL ' .. tostring(id))
    end
    return {
        type = 'PUBREL',
        id   = id,
    }
end

function mt:_parse_pubcomp (s)
    local id = unpack('>I2', s)
    if self.logger then
        self.logger:debug('MQTT< PUBCOMP ' .. tostring(id))
    end
    return {
        type = 'PUBCOMP',
        id   = id,
    }
end

local valid_code_suback = {
    [0]   = true,       -- Success - Maximum QoS 0
    [1]   = true,       -- Success - Maximum QoS 1
    [2]   = true,       -- Success - Maximum QoS 2
    [128] = true,       -- Failure
}

function mt:_parse_suback (s)
    local id = unpack('>I2', s)
    local resp = { byte(s, 3, #s) }
    for i = 1, #resp do
        local v = resp[i]
        if not valid_code_suback[v] then
            return self:_hangup('invalid code in SUBACK: ' .. tostring(v))
        end
    end
    if self.logger then
        local t = {}
        for i = 1, #resp do
            t[#t+1] = tostring(resp[i])
        end
        self.logger:debug('MQTT< SUBACK ' .. tostring(id) .. ' ' .. concat(t, ' '))
    end
    return {
        type    = 'SUBACK',
        id      = id,
        payload = resp,
    }
end

function mt:_parse_unsuback (s)
    local id = unpack('>I2', s)
    if self.logger then
        self.logger:debug('MQTT< UNSUBACK ' .. tostring(id))
    end
    return {
        type = 'UNSUBACK',
        id   = id,
    }
end

function mt:_parse_pingresp ()
    if self.logger then
        self.logger:debug('MQTT< PINGRESP')
    end
    return {
        type = 'PINGRESP',
    }
end

local expected_flags = {
    [0x2] = 0x0,        -- connack
    [0x4] = 0x0,        -- puback
    [0x5] = 0x0,        -- pubrec
    [0x6] = 0x2,        -- pubrel
    [0x7] = 0x0,        -- pubcomp
    [0x9] = 0x0,        -- suback
    [0xB] = 0x0,        -- unsuback
    [0xD] = 0x0,        -- pingresp
}

local expected_length = {
    [0x2] = 2,          -- connack
    [0x4] = 2,          -- puback
    [0x5] = 2,          -- pubrec
    [0x6] = 2,          -- pubrel
    [0x7] = 2,          -- pubcomp
    [0xB] = 2,          -- unsuback
    [0xD] = 0,          -- pingresp
}

local min_length = {
    [0x3] = 3,          -- publish
    [0x9] = 3,          -- suback
}

function mt:_fetch ()
    local ch, msg = self.socket:read(1)
    if not ch then
        return self:_error(msg)
    end
    local b = byte(ch)
    local ptype = b >> 4
    local flags = b & 0x0F
    local expected_flag = expected_flags[ptype]
    if expected_flag and expected_flag ~= flags then
        return self:_hangup(format('invalid flags: %02X', b))
    end

    local rem_len = 0
    local mult = 1
    local nb = 0
    repeat
        ch, msg = self.socket:read(1)
        if not ch then
            return self:_error(msg)
        end
        local v = byte(ch)
        rem_len = rem_len + (v & 0x7F) * mult
        mult = mult * 0x80
        nb = nb + 1
        if nb >= 4 then
            return self:_hangup('invalid vbi: too long')
        end
    until (v & 0x80) == 0

    local expected_len = expected_length[ptype]
    if expected_len and expected_len ~= rem_len then
        return self:_hangup(format('invalid length %d for: %02X', rem_len, b))
    end
    local min_len = min_length[ptype]
    if min_len and rem_len < min_len then
        return self:_hangup(format('invalid length %d for: %02X', rem_len, b))
    end

    local max_packet_size = self.max_packet_size
    if max_packet_size and rem_len > max_packet_size then
        return self:_hangup('packet too large: ' .. tostring(rem_len))
    end

    local s
    if rem_len > 0 then
        s, msg = self.socket:read(rem_len)
        if not s or #s ~= rem_len then
            return self:_error(msg or "missing data")
        end
    end
    return ptype, flags, s
end

function mt:read ()
    local ptype, flags, s = self:_fetch()
    if not ptype then
        return nil, flags
    end
    local ret, msg
    if     ptype == 0x2 then
        if self.connack_received then
            return self:_hangup('CONNACK already received')
        end
        ret, msg = self:_parse_connack(s)
        if ret then
            if ret.rc == 0 then
                self.connack_received = true
                self.session_present = ret.sp
                if self.clean and self.session_present then
                    return self:_hangup('invalid CONNACK (sp but clean)')
                end
                local session = self.session
                for i = 1, #session.queue do
                    local id = session.queue[i]
                    local pt = session.ptype[id]
                    if pt == 'publish' then
                        local t = session.publish[id]
                        local options = t[3]
                        local f = 0x8 | (options.qos << 1) | (options.retain and 0x1 or 0x0)
                        self:_send_publish(f, id, t[1], t[2])
                    elseif pt == 'pubrel' then
                        self:_send_pubrel(id)
                    end
                end
                for i = 1, #session.rqueue do
                    local id = session.rqueue[i]
                    self:_send_pubrec(id)
                end
            end
            self:_connect(ret.rc, ret.sp)
        end
    elseif ptype == 0x3 then
        if not self.connack_received then
            return self:_hangup('CONNACK not received')
        end
        ret, msg = self:_parse_publish(s, flags)
        if ret then
            local qos = ret.qos
            local id = ret.id
            local topic = ret.topic
            local payload = ret.payload
            if qos == 0 then
                self:_message(topic, payload)
            elseif qos == 1 then
                self:_message(topic, payload)
                self:_send_puback(id)
            else -- qos == 2
                local session = self.session
                if not session.pubrec[id] then
                    self:_message(topic, payload)
                end
                insert(session.rqueue, id)
                session.pubrec[id] = true
                self:_send_pubrec(id)
            end
        end
    elseif ptype == 0x4 then
        if not self.connack_received then
            return self:_hangup('CONNACK not received')
        end
        ret, msg = self:_parse_puback(s)
        local id = ret.id
        local session = self.session
        if not self.session_present and not session.publish[id] then
            return self:_hangup('mismatch for PUBLISH/PUBACK')
        end
        session.publish[id] = nil
        session.ptype[id] = nil
        remove_id(session.queue, id)
    elseif ptype == 0x5 then
        if not self.connack_received then
            return self:_hangup('CONNACK not received')
        end
        ret, msg = self:_parse_pubrec(s)
        local id = ret.id
        local session = self.session
        if not self.session_present and not session.publish[id] then
            return self:_hangup('mismatch for PUBLISH/PUBREC')
        end
        remove_id(session.queue, id)
        insert(session.queue, id)
        session.ptype[id] = 'pubrel'
        session.pubrel[id] = session.publish[id]
        session.publish[id] = nil
        self:_send_pubrel(id)
    elseif ptype == 0x6 then
        if not self.connack_received then
            return self:_hangup('CONNACK not received')
        end
        ret, msg = self:_parse_pubrel(s)
        local id = ret.id
        local session = self.session
        if not self.session_present and not session.pubrec[id] then
            return self:_hangup('mismatch for PUBREC/PUBREL')
        end
        session.pubrec[id] = nil
        remove_id(session.rqueue, id)
        self:_send_pubcomp(id)
    elseif ptype == 0x7 then
        if not self.connack_received then
            return self:_hangup('CONNACK not received')
        end
        ret, msg = self:_parse_pubcomp(s)
        local id = ret.id
        local session = self.session
        if not self.session_present and not session.pubrel[id] then
            return self:_hangup('mismatch for PUBREL/PUBCOMP')
        end
        session.pubrel[id] = nil
        session.ptype[id] = nil
        remove_id(session.queue, id)
    elseif ptype == 0x9 then
        if not self.connack_received then
            return self:_hangup('CONNACK not received')
        end
        ret, msg = self:_parse_suback(s)
        if ret then
            local id = ret.id
            local payload = ret.payload
            local session = self.session
            local list = session.subscribe[id] or {}
            if #list ~= 2 * #payload then
                return self:_hangup('mismatch for SUBSCRIBE/SUBACK')
            end
            for i = 1, #payload do
                local topic = list[2 * i - 1]
                session.subscribe[topic] = payload[i]
            end
            session.subscribe[id] = nil
            session.ptype[id] = nil
            remove_id(session.queue, id)
        end
    elseif ptype == 0xB then
        if not self.connack_received then
            return self:_hangup('CONNACK not received')
        end
        ret, msg = self:_parse_unsuback(s)
        local id = ret.id
        local session = self.session
        local list = session.unsubscribe[id]
        if not list then
            return self:_hangup('mismatch for UNSUBSCRIBE/UNSUBACK')
        end
        for i = 1, #list do
            local topic = list[i]
            session.subscribe[topic] = nil
        end
        session.unsubscribe[id] = nil
        session.ptype[id] = nil
        remove_id(session.queue, id)
    elseif ptype == 0xD then
        if not self.connack_received then
            return self:_hangup('CONNACK not received')
        end
        ret, msg = self:_parse_pingresp()
    else
        return self:_hangup(format('invalid packet control: %01X%01X', ptype, flags))
    end
    return ret, msg
end

local function new (t)
    if type(t) ~= 'table' then
        typeerror('new', 1, t, 'table')
    end
    local socket = t.socket
    if not socket or not valid_socket(socket) then
        error("invalid socket (" .. tostring(socket) .. ") in table to 'new'")
    end
    local logger = t.logger
    if logger and not valid_logger(logger) then
        error("invalid logger (" .. tostring(logger) .. ") in table to 'new'")
    end
    local on_connect = t.on_connect
    if on_connect and type(on_connect) ~= 'function' then
        error("invalid on_connect (" .. tostring(on_connect) .. ") in table to 'new'")
    end
    local on_message = t.on_message
    if on_message and type(on_message) ~= 'function' then
        error("invalid on_message (" .. tostring(on_message) .. ") in table to 'new'")
    end
    local on_error = t.on_error
    if on_error and type(on_error) ~= 'function' then
        error("invalid on_error (" .. tostring(on_error) .. ") in table to 'new'")
    end
    local max_packet_size = t.max_packet_size
    if max_packet_size and (math_type(max_packet_size) ~= 'integer' or max_packet_size < 0 or max_packet_size > 0xFFFFFFF) then
        error("invalid max_packet_size (" .. tostring(max_packet_size) .. ") in table to 'new'")
    end

    local obj = {
        logger          = logger,
        socket          = socket,
        on_connect      = on_connect,
        on_message      = on_message,
        on_error        = on_error,
        session         = new_session(),
        max_packet_size = max_packet_size,
    }
    setmetatable(obj, {
        __index = mt,
    })
    return obj
end

local m = {}

function m.match (name, filter)
    if type(name) ~= 'string' then
        typeerror('match', 1, name, 'string')
    end
    if not valid_topic_name(name, true) then
        error("invalid Topic Name to 'match'")
    end
    if type(filter) ~= 'string' then
        typeerror('match', 2, filter, 'string')
    end
    if not valid_topic_filter(filter) then
        error("invalid Topic Filter to 'match'")
    end

    local iter_n = utf8_codes(name)
    local i, c = iter_n(name, 0)
    local iter_f = utf8_codes(filter)
    local j, p = iter_f(filter, 0)
    if (p == 36 and c ~= 36) or (c == 36 and p ~= 36) then      -- $
        return false
    end
    while j do
        if p ~= c then
            if p == 35 then             -- #
                return true
            elseif p == 43 then         -- +
                j, p = iter_f(filter, j)
                while i and c ~= 47 do  -- /
                    i, c = iter_n(name, i)
                end
            else
                return false
            end
        else
            i, c = iter_n(name, i)
            j, p = iter_f(filter, j)
            if not i and p == 47 then   -- /
                local _, _p = iter_f(filter, j)
                if _p == 35 then        -- #
                    return true         -- foo matching foo/#
                end
            end
        end
    end
    return not i
end

m.PORT = '1883'
m.PORT_TLS = '8883'

setmetatable(m, {
    __call = function (_, t) return new(t) end
})

m._NAME = ...
m._VERSION = "0.3.2"
m._DESCRIPTION = "lua-mqtt : client library for MQTT 3.1.1"
m._COPYRIGHT = "Copyright (c) 2022-2024 Francois Perrad"
return m
--
-- This library is licensed under the terms of the MIT/X11 license,
-- like Lua itself.
--
