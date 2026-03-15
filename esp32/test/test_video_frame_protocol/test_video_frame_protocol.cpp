/**
 * Unit tests for video frame binary protocol.
 * Tests header parsing, fragment reassembly, and double buffering logic.
 */

#include <unity.h>
#include <cstdint>
#include <cstring>

// Protocol constants (must match udp_video.h)
static constexpr uint8_t VIDEO_MAGIC = 0x56;
static constexpr uint8_t VIDEO_FLAG_LAST_FRAGMENT = 0x01;
static constexpr size_t VIDEO_HEADER_SIZE = 8;
static constexpr size_t VIDEO_MAX_PAYLOAD = 1472 - VIDEO_HEADER_SIZE;  // 1464

// Simplified reassembly state for testing (mirrors udp_video.cpp logic)
struct FrameReassembler {
	uint8_t* frontBuffer;
	uint8_t* backBuffer;
	size_t frameSize;
	uint16_t currentSequence;
	size_t bytesReceived;
	bool frameReady;

	FrameReassembler(size_t size)
		: frontBuffer(new uint8_t[size]()),
		  backBuffer(new uint8_t[size]()),
		  frameSize(size),
		  currentSequence(0xFFFF),
		  bytesReceived(0),
		  frameReady(false) {}

	~FrameReassembler() {
		delete[] frontBuffer;
		delete[] backBuffer;
	}

	// Process a raw packet (header + payload)
	bool processPacket(const uint8_t* data, size_t len) {
		if (len < VIDEO_HEADER_SIZE) return false;

		uint8_t magic = data[0];
		if (magic != VIDEO_MAGIC) return false;

		uint8_t flags = data[1];
		uint16_t sequence = (data[2] << 8) | data[3];
		uint16_t totalSize = (data[4] << 8) | data[5];
		uint16_t fragmentOffset = (data[6] << 8) | data[7];
		bool lastFragment = (flags & VIDEO_FLAG_LAST_FRAGMENT) != 0;

		if (totalSize != frameSize) return false;

		// New sequence resets reassembly
		if (sequence != currentSequence) {
			currentSequence = sequence;
			bytesReceived = 0;
		}

		size_t payloadSize = len - VIDEO_HEADER_SIZE;
		if (fragmentOffset + payloadSize > frameSize) return false;

		memcpy(backBuffer + fragmentOffset, data + VIDEO_HEADER_SIZE, payloadSize);
		bytesReceived += payloadSize;

		if (lastFragment && bytesReceived >= frameSize) {
			// Swap buffers
			uint8_t* temp = frontBuffer;
			frontBuffer = backBuffer;
			backBuffer = temp;
			frameReady = true;
			currentSequence = 0xFFFF;
			bytesReceived = 0;
			return true;  // Frame complete
		}
		return false;
	}
};

// Helper to build a video frame packet
static void buildPacket(uint8_t* buf, size_t* outLen,
                        uint16_t sequence, uint16_t totalSize,
                        uint16_t fragmentOffset, bool lastFragment,
                        const uint8_t* payload, size_t payloadLen) {
	buf[0] = VIDEO_MAGIC;
	buf[1] = lastFragment ? VIDEO_FLAG_LAST_FRAGMENT : 0;
	buf[2] = (sequence >> 8) & 0xFF;
	buf[3] = sequence & 0xFF;
	buf[4] = (totalSize >> 8) & 0xFF;
	buf[5] = totalSize & 0xFF;
	buf[6] = (fragmentOffset >> 8) & 0xFF;
	buf[7] = fragmentOffset & 0xFF;
	memcpy(buf + VIDEO_HEADER_SIZE, payload, payloadLen);
	*outLen = VIDEO_HEADER_SIZE + payloadLen;
}

// ============================================================
// Test: Single-packet frame (small matrix like 32x8)
// ============================================================
void test_single_packet_frame() {
	// 32x8 RGB24 = 768 bytes, fits in one packet
	const size_t frameSize = 768;
	FrameReassembler r(frameSize);

	// Create test frame data
	uint8_t frameData[768];
	for (size_t i = 0; i < 768; i++) {
		frameData[i] = (uint8_t)(i & 0xFF);
	}

	uint8_t packet[1472];
	size_t packetLen;
	buildPacket(packet, &packetLen, 0, frameSize, 0, true, frameData, 768);

	TEST_ASSERT_TRUE(r.processPacket(packet, packetLen));
	TEST_ASSERT_TRUE(r.frameReady);
	TEST_ASSERT_EQUAL_MEMORY(frameData, r.frontBuffer, 768);
}

// ============================================================
// Test: Multi-packet frame (64x32 matrix)
// ============================================================
void test_multi_packet_frame() {
	// 64x32 RGB24 = 6144 bytes, needs 5 packets
	const size_t frameSize = 6144;
	FrameReassembler r(frameSize);

	uint8_t frameData[6144];
	for (size_t i = 0; i < 6144; i++) {
		frameData[i] = (uint8_t)(i & 0xFF);
	}

	uint8_t packet[1472];
	size_t packetLen;
	size_t offset = 0;
	uint16_t seq = 42;

	// Send 5 fragments
	int fragmentCount = 0;
	while (offset < frameSize) {
		size_t payloadLen = frameSize - offset;
		if (payloadLen > VIDEO_MAX_PAYLOAD) payloadLen = VIDEO_MAX_PAYLOAD;
		bool last = (offset + payloadLen >= frameSize);

		buildPacket(packet, &packetLen, seq, frameSize, offset, last, frameData + offset, payloadLen);
		bool complete = r.processPacket(packet, packetLen);

		if (!last) {
			TEST_ASSERT_FALSE(complete);
		} else {
			TEST_ASSERT_TRUE(complete);
		}

		offset += payloadLen;
		fragmentCount++;
	}

	TEST_ASSERT_EQUAL(5, fragmentCount);
	TEST_ASSERT_TRUE(r.frameReady);
	TEST_ASSERT_EQUAL_MEMORY(frameData, r.frontBuffer, 6144);
}

// ============================================================
// Test: Wrong magic byte rejected
// ============================================================
void test_wrong_magic_rejected() {
	FrameReassembler r(768);

	uint8_t packet[1472];
	size_t packetLen;
	uint8_t data[768] = {};
	buildPacket(packet, &packetLen, 0, 768, 0, true, data, 768);
	packet[0] = 0xFF;  // Wrong magic

	TEST_ASSERT_FALSE(r.processPacket(packet, packetLen));
	TEST_ASSERT_FALSE(r.frameReady);
}

// ============================================================
// Test: Wrong frame size rejected
// ============================================================
void test_wrong_frame_size_rejected() {
	FrameReassembler r(768);

	uint8_t packet[1472];
	size_t packetLen;
	uint8_t data[768] = {};
	// Total size in header doesn't match expected frame size
	buildPacket(packet, &packetLen, 0, 1024, 0, true, data, 768);

	TEST_ASSERT_FALSE(r.processPacket(packet, packetLen));
}

// ============================================================
// Test: Packet too short rejected
// ============================================================
void test_short_packet_rejected() {
	FrameReassembler r(768);

	uint8_t packet[4] = {VIDEO_MAGIC, 0, 0, 0};
	TEST_ASSERT_FALSE(r.processPacket(packet, 4));
}

// ============================================================
// Test: Fragment overflow rejected
// ============================================================
void test_fragment_overflow_rejected() {
	FrameReassembler r(768);

	uint8_t packet[1472];
	size_t packetLen;
	uint8_t data[100] = {};
	// Fragment offset + payload would exceed frame size
	buildPacket(packet, &packetLen, 0, 768, 700, false, data, 100);

	TEST_ASSERT_FALSE(r.processPacket(packet, packetLen));
}

// ============================================================
// Test: New sequence discards incomplete previous frame
// ============================================================
void test_new_sequence_resets_reassembly() {
	const size_t frameSize = 768;
	FrameReassembler r(frameSize);

	uint8_t data1[400] = {};
	memset(data1, 0xAA, 400);
	uint8_t packet[1472];
	size_t packetLen;

	// Start sequence 1, send partial
	buildPacket(packet, &packetLen, 1, frameSize, 0, false, data1, 400);
	TEST_ASSERT_FALSE(r.processPacket(packet, packetLen));

	// Start sequence 2 (full frame in one packet)
	uint8_t data2[768];
	memset(data2, 0xBB, 768);
	buildPacket(packet, &packetLen, 2, frameSize, 0, true, data2, 768);
	TEST_ASSERT_TRUE(r.processPacket(packet, packetLen));

	// Front buffer should have sequence 2's data
	TEST_ASSERT_EQUAL_UINT8(0xBB, r.frontBuffer[0]);
	TEST_ASSERT_EQUAL_UINT8(0xBB, r.frontBuffer[767]);
}

// ============================================================
// Test: Double buffer swap
// ============================================================
void test_double_buffer_swap() {
	const size_t frameSize = 768;
	FrameReassembler r(frameSize);

	uint8_t packet[1472];
	size_t packetLen;

	// Frame 1
	uint8_t frame1[768];
	memset(frame1, 0x11, 768);
	buildPacket(packet, &packetLen, 1, frameSize, 0, true, frame1, 768);
	r.processPacket(packet, packetLen);
	TEST_ASSERT_EQUAL_UINT8(0x11, r.frontBuffer[0]);

	// Frame 2 — front buffer should now have frame 2, back buffer has frame 1
	uint8_t frame2[768];
	memset(frame2, 0x22, 768);
	buildPacket(packet, &packetLen, 2, frameSize, 0, true, frame2, 768);
	r.processPacket(packet, packetLen);
	TEST_ASSERT_EQUAL_UINT8(0x22, r.frontBuffer[0]);
	TEST_ASSERT_EQUAL_UINT8(0x11, r.backBuffer[0]);
}

// ============================================================
// Test: Sequence number big-endian encoding
// ============================================================
void test_big_endian_sequence() {
	FrameReassembler r(768);

	uint8_t packet[1472];
	size_t packetLen;
	uint8_t data[768] = {};

	// Sequence 0x0102 (258)
	buildPacket(packet, &packetLen, 0x0102, 768, 0, true, data, 768);
	TEST_ASSERT_EQUAL_UINT8(0x01, packet[2]);
	TEST_ASSERT_EQUAL_UINT8(0x02, packet[3]);
	TEST_ASSERT_TRUE(r.processPacket(packet, packetLen));
}

// ============================================================
// Test: Reset clears stale frame data (stop/start scenario)
// ============================================================
void test_reset_clears_stale_frames() {
	const size_t frameSize = 768;
	FrameReassembler r(frameSize);

	uint8_t packet[1472];
	size_t packetLen;

	// Play first video — fill front buffer with 0xAA
	uint8_t frame1[768];
	memset(frame1, 0xAA, 768);
	buildPacket(packet, &packetLen, 1, frameSize, 0, true, frame1, 768);
	r.processPacket(packet, packetLen);
	TEST_ASSERT_EQUAL_UINT8(0xAA, r.frontBuffer[0]);

	// Simulate stop + start: clear front buffer and reset state
	memset(r.frontBuffer, 0, frameSize);
	r.currentSequence = 0xFFFF;
	r.bytesReceived = 0;
	r.frameReady = false;

	// Front buffer should be zeroed (no stale frame from previous video)
	TEST_ASSERT_EQUAL_UINT8(0x00, r.frontBuffer[0]);
	TEST_ASSERT_EQUAL_UINT8(0x00, r.frontBuffer[767]);
	TEST_ASSERT_FALSE(r.frameReady);

	// New video frame arrives — should work normally
	uint8_t frame2[768];
	memset(frame2, 0xBB, 768);
	buildPacket(packet, &packetLen, 1, frameSize, 0, true, frame2, 768);
	TEST_ASSERT_TRUE(r.processPacket(packet, packetLen));
	TEST_ASSERT_EQUAL_UINT8(0xBB, r.frontBuffer[0]);
}

int main(int argc, char** argv) {
	(void)argc;
	(void)argv;
	UNITY_BEGIN();
	RUN_TEST(test_single_packet_frame);
	RUN_TEST(test_multi_packet_frame);
	RUN_TEST(test_wrong_magic_rejected);
	RUN_TEST(test_wrong_frame_size_rejected);
	RUN_TEST(test_short_packet_rejected);
	RUN_TEST(test_fragment_overflow_rejected);
	RUN_TEST(test_new_sequence_resets_reassembly);
	RUN_TEST(test_double_buffer_swap);
	RUN_TEST(test_big_endian_sequence);
	RUN_TEST(test_reset_clears_stale_frames);
	return UNITY_END();
}
