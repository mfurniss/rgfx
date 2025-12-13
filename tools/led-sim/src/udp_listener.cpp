/**
 * UDP Listener Implementation
 */
#include "udp_listener.h"

#include <arpa/inet.h>
#include <cerrno>
#include <cstdio>
#include <cstring>
#include <fcntl.h>
#include <netinet/in.h>
#include <sys/socket.h>
#include <unistd.h>

UdpListener::~UdpListener() {
	cleanup();
}

bool UdpListener::init(int port) {
	// Create UDP socket
	socketFd_ = socket(AF_INET, SOCK_DGRAM, 0);
	if (socketFd_ < 0) {
		printf("UDP: Failed to create socket: %s\n", strerror(errno));
		return false;
	}

	// Allow address reuse (helps when restarting quickly)
	int reuse = 1;
	if (setsockopt(socketFd_, SOL_SOCKET, SO_REUSEADDR, &reuse, sizeof(reuse)) < 0) {
		printf("UDP: Warning - setsockopt SO_REUSEADDR failed: %s\n", strerror(errno));
	}

	// Also set SO_REUSEPORT on macOS for multiple listeners
#ifdef SO_REUSEPORT
	if (setsockopt(socketFd_, SOL_SOCKET, SO_REUSEPORT, &reuse, sizeof(reuse)) < 0) {
		printf("UDP: Warning - setsockopt SO_REUSEPORT failed: %s\n", strerror(errno));
	}
#endif

	// Bind to port on all interfaces
	struct sockaddr_in addr;
	memset(&addr, 0, sizeof(addr));
	addr.sin_family = AF_INET;
	addr.sin_addr.s_addr = INADDR_ANY;
	addr.sin_port = htons(port);

	if (bind(socketFd_, (struct sockaddr*)&addr, sizeof(addr)) < 0) {
		printf("UDP: Failed to bind to port %d: %s\n", port, strerror(errno));
		close(socketFd_);
		socketFd_ = -1;
		return false;
	}

	// Set non-blocking mode
	int flags = fcntl(socketFd_, F_GETFL, 0);
	if (flags < 0 || fcntl(socketFd_, F_SETFL, flags | O_NONBLOCK) < 0) {
		printf("UDP: Failed to set non-blocking mode: %s\n", strerror(errno));
		close(socketFd_);
		socketFd_ = -1;
		return false;
	}

	printf("UDP: Listening on port %d\n", port);
	return true;
}

void UdpListener::cleanup() {
	if (socketFd_ >= 0) {
		close(socketFd_);
		socketFd_ = -1;
	}
}

bool UdpListener::receive(char* buffer, size_t bufferSize, size_t& bytesRead) {
	if (socketFd_ < 0) {
		return false;
	}

	ssize_t received = recvfrom(socketFd_, buffer, bufferSize - 1, 0, nullptr, nullptr);

	if (received < 0) {
		// EAGAIN/EWOULDBLOCK means no data available (expected in non-blocking mode)
		if (errno == EAGAIN || errno == EWOULDBLOCK) {
			return false;
		}
		// Actual error
		printf("UDP: recvfrom error: %s\n", strerror(errno));
		return false;
	}

	if (received == 0) {
		return false;
	}

	// Null-terminate for JSON parsing
	buffer[received] = '\0';
	bytesRead = static_cast<size_t>(received);
	return true;
}
