/**
 * UDP Listener for receiving effect commands from RGFX Hub
 *
 * Listens on the same port as ESP32 drivers (8811) to receive
 * effect payloads from the Hub's Effects Playground.
 */
#pragma once

#include <cstddef>

class UdpListener {
public:
	~UdpListener();

	/**
	 * Initialize UDP socket and bind to port.
	 * @param port UDP port to listen on (default: 8811)
	 * @return true if successful
	 */
	bool init(int port = 8811);

	/**
	 * Close socket and release resources.
	 */
	void cleanup();

	/**
	 * Non-blocking receive. Call this in the main loop.
	 * @param buffer Buffer to store received data
	 * @param bufferSize Size of buffer
	 * @param bytesRead Output: number of bytes received
	 * @return true if data was received, false if no data available
	 */
	bool receive(char* buffer, size_t bufferSize, size_t& bytesRead);

private:
	int socketFd_ = -1;
};
