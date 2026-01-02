const sharedState = require('../routes/sharedState');

describe("Shared State Management Module", function() {
    beforeEach(function() {
        sharedState.setUsername(null);
    });

    describe("Basic Functionality", function() {
        it("should initialize with a null username", function() {
            const currentUser = sharedState.getUsername();
            expect(currentUser).toBeNull();
        });

        it("should successfully set a valid username", function() {
            const validUser = "student@rutgers.edu";
            sharedState.setUsername(validUser);
            expect(sharedState.getUsername()).toBe(validUser);
        });
    });

    describe("State Updates", function() {
        it("should overwrite an existing username with a new one", function() {
            sharedState.setUsername("userA");
            expect(sharedState.getUsername()).toBe("userA");
            
            sharedState.setUsername("userB");
            expect(sharedState.getUsername()).toBe("userB");
        });
    });

    describe("Edge Cases", function() {
        it("should handle setting username to an empty string", function() {
            sharedState.setUsername("");
            expect(sharedState.getUsername()).toBe("");
        });

        it("should allow clearing the user session (setting to null)", function() {
            sharedState.setUsername("activeUser");
            sharedState.setUsername(null);
            expect(sharedState.getUsername()).toBeNull();
        });

        it("should handle undefined input gracefully", function() {
            sharedState.setUsername(undefined);
            expect(sharedState.getUsername()).toBeUndefined();
        });
    });
});