// simple.test.js - Basic test to verify Jest setup

describe('Basic Test Setup', () => {
    test('should work with basic JavaScript', () => {
        expect(2 + 2).toBe(4);
    });

    test('should work with objects', () => {
        const testObj = { name: 'test', value: 42 };
        expect(testObj.name).toBe('test');
        expect(testObj.value).toBe(42);
    });

    test('should work with arrays', () => {
        const testArray = [1, 2, 3, 4, 5];
        expect(testArray.length).toBe(5);
        expect(testArray).toContain(3);
    });
});