#pragma once

#include <vector>
#include <utility>

/**
 * Vector wrapper that automatically caps size and removes oldest elements.
 * Used by effect classes to prevent unbounded memory growth under high load.
 *
 * @tparam T Element type
 * @tparam MaxSize Maximum number of elements (oldest removed when exceeded)
 */
template <typename T, size_t MaxSize>
class CappedVector {
   private:
	std::vector<T> items;

   public:
	using iterator = typename std::vector<T>::iterator;
	using const_iterator = typename std::vector<T>::const_iterator;

	CappedVector() { items.reserve(MaxSize / 4); }

	/**
	 * Add element by move, dropping oldest if at capacity.
	 */
	void add(T&& item) {
		if (items.size() >= MaxSize) {
			items.erase(items.begin());  // Drop oldest
		}
		items.push_back(std::move(item));
	}

	/**
	 * Add element by copy, dropping oldest if at capacity.
	 */
	void add(const T& item) {
		if (items.size() >= MaxSize) {
			items.erase(items.begin());
		}
		items.push_back(item);
	}

	// Forward std::vector interface
	iterator begin() { return items.begin(); }
	iterator end() { return items.end(); }
	const_iterator begin() const { return items.begin(); }
	const_iterator end() const { return items.end(); }
	size_t size() const { return items.size(); }
	bool empty() const { return items.empty(); }
	void clear() { items.clear(); }
	iterator erase(iterator it) { return items.erase(it); }
	T& operator[](size_t i) { return items[i]; }
	const T& operator[](size_t i) const { return items[i]; }
	T& back() { return items.back(); }
	void pop_back() { items.pop_back(); }
	void reserve(size_t n) { items.reserve(n); }
};
