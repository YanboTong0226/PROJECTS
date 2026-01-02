const { pool } = require('../utils/db');

describe("Database Connection Module", function() {
    it("should export pool object", function() {
        expect(pool).toBeDefined();
        expect(typeof pool).toBe('object');
    });

    it("should have getConnection method", function() {
        expect(pool.getConnection).toBeDefined();
        expect(typeof pool.getConnection).toBe('function');
    });

    it("should have query method", function() {
        expect(pool.query).toBeDefined();
        expect(typeof pool.query).toBe('function');
    });

    describe("Database Configuration", function() {
        it("should have pool methods available", function() {
            expect(pool.getConnection).toBeDefined();
            expect(pool.query).toBeDefined();
        });
    });
});

