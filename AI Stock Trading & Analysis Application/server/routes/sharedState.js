// sharedState.js

let username1 = null;

// Provide an interface to access and modify `username1`.
module.exports = {
    getUsername: () => username1,
    setUsername: (username) => { username1 = username; },
};
