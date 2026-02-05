#include <unity.h>
#include "effects/instance_vector.h"

// Simple test struct
struct TestItem {
	int value;
	TestItem() : value(0) {}
	explicit TestItem(int v) : value(v) {}
};

// =============================================================================
// Basic Operations
// =============================================================================

void test_capped_vector_empty_on_creation() {
	CappedVector<TestItem, 10> vec;
	TEST_ASSERT_TRUE(vec.empty());
	TEST_ASSERT_EQUAL(0, vec.size());
}

void test_capped_vector_add_single_item() {
	CappedVector<TestItem, 10> vec;
	vec.add(TestItem(42));
	TEST_ASSERT_FALSE(vec.empty());
	TEST_ASSERT_EQUAL(1, vec.size());
	TEST_ASSERT_EQUAL(42, vec[0].value);
}

void test_capped_vector_add_multiple_items() {
	CappedVector<TestItem, 10> vec;
	vec.add(TestItem(1));
	vec.add(TestItem(2));
	vec.add(TestItem(3));
	TEST_ASSERT_EQUAL(3, vec.size());
	TEST_ASSERT_EQUAL(1, vec[0].value);
	TEST_ASSERT_EQUAL(2, vec[1].value);
	TEST_ASSERT_EQUAL(3, vec[2].value);
}

void test_capped_vector_add_by_copy() {
	CappedVector<TestItem, 10> vec;
	TestItem item(99);
	vec.add(item);
	TEST_ASSERT_EQUAL(1, vec.size());
	TEST_ASSERT_EQUAL(99, vec[0].value);
}

void test_capped_vector_add_by_move() {
	CappedVector<TestItem, 10> vec;
	vec.add(TestItem(77));
	TEST_ASSERT_EQUAL(1, vec.size());
	TEST_ASSERT_EQUAL(77, vec[0].value);
}

// =============================================================================
// Capacity Capping (FIFO Eviction)
// =============================================================================

void test_capped_vector_caps_at_max_size() {
	CappedVector<TestItem, 3> vec;
	vec.add(TestItem(1));
	vec.add(TestItem(2));
	vec.add(TestItem(3));
	TEST_ASSERT_EQUAL(3, vec.size());

	// Adding 4th item should evict oldest
	vec.add(TestItem(4));
	TEST_ASSERT_EQUAL(3, vec.size());
}

void test_capped_vector_fifo_eviction_oldest_removed() {
	CappedVector<TestItem, 3> vec;
	vec.add(TestItem(1));
	vec.add(TestItem(2));
	vec.add(TestItem(3));
	vec.add(TestItem(4));

	// Oldest (1) should be evicted, remaining: 2, 3, 4
	TEST_ASSERT_EQUAL(2, vec[0].value);
	TEST_ASSERT_EQUAL(3, vec[1].value);
	TEST_ASSERT_EQUAL(4, vec[2].value);
}

void test_capped_vector_multiple_evictions() {
	CappedVector<TestItem, 3> vec;
	for (int i = 1; i <= 10; i++) {
		vec.add(TestItem(i));
	}
	TEST_ASSERT_EQUAL(3, vec.size());
	// Should have last 3 items: 8, 9, 10
	TEST_ASSERT_EQUAL(8, vec[0].value);
	TEST_ASSERT_EQUAL(9, vec[1].value);
	TEST_ASSERT_EQUAL(10, vec[2].value);
}

void test_capped_vector_size_one() {
	CappedVector<TestItem, 1> vec;
	vec.add(TestItem(1));
	TEST_ASSERT_EQUAL(1, vec.size());
	TEST_ASSERT_EQUAL(1, vec[0].value);

	vec.add(TestItem(2));
	TEST_ASSERT_EQUAL(1, vec.size());
	TEST_ASSERT_EQUAL(2, vec[0].value);
}

// =============================================================================
// Iterator Interface
// =============================================================================

void test_capped_vector_begin_end_iteration() {
	CappedVector<TestItem, 10> vec;
	vec.add(TestItem(10));
	vec.add(TestItem(20));
	vec.add(TestItem(30));

	int sum = 0;
	for (auto it = vec.begin(); it != vec.end(); ++it) {
		sum += it->value;
	}
	TEST_ASSERT_EQUAL(60, sum);
}

void test_capped_vector_range_based_for() {
	CappedVector<TestItem, 10> vec;
	vec.add(TestItem(5));
	vec.add(TestItem(10));
	vec.add(TestItem(15));

	int sum = 0;
	for (const auto& item : vec) {
		sum += item.value;
	}
	TEST_ASSERT_EQUAL(30, sum);
}

void test_capped_vector_const_iteration() {
	CappedVector<TestItem, 10> vec;
	vec.add(TestItem(1));
	vec.add(TestItem(2));

	const CappedVector<TestItem, 10>& constVec = vec;
	int sum = 0;
	for (auto it = constVec.begin(); it != constVec.end(); ++it) {
		sum += it->value;
	}
	TEST_ASSERT_EQUAL(3, sum);
}

// =============================================================================
// Erase Operation
// =============================================================================

void test_capped_vector_erase_single() {
	CappedVector<TestItem, 10> vec;
	vec.add(TestItem(1));
	vec.add(TestItem(2));
	vec.add(TestItem(3));

	auto it = vec.begin();
	++it;  // Point to item with value 2
	vec.erase(it);

	TEST_ASSERT_EQUAL(2, vec.size());
	TEST_ASSERT_EQUAL(1, vec[0].value);
	TEST_ASSERT_EQUAL(3, vec[1].value);
}

void test_capped_vector_erase_returns_next_iterator() {
	CappedVector<TestItem, 10> vec;
	vec.add(TestItem(1));
	vec.add(TestItem(2));
	vec.add(TestItem(3));

	auto it = vec.begin();
	it = vec.erase(it);  // Erase first, returns iterator to second

	TEST_ASSERT_EQUAL(2, vec.size());
	TEST_ASSERT_EQUAL(2, it->value);
}

void test_capped_vector_erase_while_iterating() {
	CappedVector<TestItem, 10> vec;
	vec.add(TestItem(1));
	vec.add(TestItem(2));
	vec.add(TestItem(3));
	vec.add(TestItem(4));

	// Remove even values
	for (auto it = vec.begin(); it != vec.end();) {
		if (it->value % 2 == 0) {
			it = vec.erase(it);
		} else {
			++it;
		}
	}

	TEST_ASSERT_EQUAL(2, vec.size());
	TEST_ASSERT_EQUAL(1, vec[0].value);
	TEST_ASSERT_EQUAL(3, vec[1].value);
}

// =============================================================================
// Other Accessors
// =============================================================================

void test_capped_vector_back() {
	CappedVector<TestItem, 10> vec;
	vec.add(TestItem(1));
	vec.add(TestItem(2));
	vec.add(TestItem(3));

	TEST_ASSERT_EQUAL(3, vec.back().value);
}

void test_capped_vector_pop_back() {
	CappedVector<TestItem, 10> vec;
	vec.add(TestItem(1));
	vec.add(TestItem(2));
	vec.add(TestItem(3));

	vec.pop_back();
	TEST_ASSERT_EQUAL(2, vec.size());
	TEST_ASSERT_EQUAL(2, vec.back().value);
}

void test_capped_vector_clear() {
	CappedVector<TestItem, 10> vec;
	vec.add(TestItem(1));
	vec.add(TestItem(2));
	vec.add(TestItem(3));

	vec.clear();
	TEST_ASSERT_TRUE(vec.empty());
	TEST_ASSERT_EQUAL(0, vec.size());
}

void test_capped_vector_index_operator() {
	CappedVector<TestItem, 10> vec;
	vec.add(TestItem(10));
	vec.add(TestItem(20));

	TEST_ASSERT_EQUAL(10, vec[0].value);
	TEST_ASSERT_EQUAL(20, vec[1].value);

	// Modify via index
	vec[0].value = 100;
	TEST_ASSERT_EQUAL(100, vec[0].value);
}

void test_capped_vector_const_index_operator() {
	CappedVector<TestItem, 10> vec;
	vec.add(TestItem(5));

	const CappedVector<TestItem, 10>& constVec = vec;
	TEST_ASSERT_EQUAL(5, constVec[0].value);
}

// =============================================================================
// Test Runner
// =============================================================================

void setUp() {}
void tearDown() {}

int main() {
	UNITY_BEGIN();

	// Basic Operations
	RUN_TEST(test_capped_vector_empty_on_creation);
	RUN_TEST(test_capped_vector_add_single_item);
	RUN_TEST(test_capped_vector_add_multiple_items);
	RUN_TEST(test_capped_vector_add_by_copy);
	RUN_TEST(test_capped_vector_add_by_move);

	// Capacity Capping (FIFO Eviction)
	RUN_TEST(test_capped_vector_caps_at_max_size);
	RUN_TEST(test_capped_vector_fifo_eviction_oldest_removed);
	RUN_TEST(test_capped_vector_multiple_evictions);
	RUN_TEST(test_capped_vector_size_one);

	// Iterator Interface
	RUN_TEST(test_capped_vector_begin_end_iteration);
	RUN_TEST(test_capped_vector_range_based_for);
	RUN_TEST(test_capped_vector_const_iteration);

	// Erase Operation
	RUN_TEST(test_capped_vector_erase_single);
	RUN_TEST(test_capped_vector_erase_returns_next_iterator);
	RUN_TEST(test_capped_vector_erase_while_iterating);

	// Other Accessors
	RUN_TEST(test_capped_vector_back);
	RUN_TEST(test_capped_vector_pop_back);
	RUN_TEST(test_capped_vector_clear);
	RUN_TEST(test_capped_vector_index_operator);
	RUN_TEST(test_capped_vector_const_index_operator);

	return UNITY_END();
}
