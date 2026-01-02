const fs = require('fs');
const path = require('path');

describe("System Data Integrity Checks", function() {
    const csvPath = path.join(__dirname, '../routes/output.csv');

    it("should find the 'output.csv' market data file", function() {
        const fileExists = fs.existsSync(csvPath);
        expect(fileExists).toBeTrue();
    });

    it("should be able to read the CSV file content", function() {
        if (fs.existsSync(csvPath)) {
            const content = fs.readFileSync(csvPath, 'utf8');
            expect(content.length).toBeGreaterThan(0);
        } else {
            pending("CSV file missing, skipping content check");
        }
    });

    it("should have the correct header format (starting with DATE/TICKER)", function() {
        if (fs.existsSync(csvPath)) {
            const content = fs.readFileSync(csvPath, 'utf8');
            const lines = content.split('\n');
            const header = lines[0];
            expect(header).toContain('DATE/TICKER');
        }
    });
    
    it("should imply multiple stock columns exist", function() {
         if (fs.existsSync(csvPath)) {
            const content = fs.readFileSync(csvPath, 'utf8');
            const header = content.split('\n')[0];
            const columns = header.split(',');
            expect(columns.length).toBeGreaterThan(1);
        }
    });
});