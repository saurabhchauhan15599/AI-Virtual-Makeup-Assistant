import { CsvToJsonConverter, convertCsvToJson } from './csv-to-json.util';

// Example usage of the CSV to JSON converter

async function exampleUsage() {
  try {
    // Example 1: Basic conversion with column names
    const columnNames = ['id', 'name', 'email', 'age', 'city'];
    
    // Convert from file
    const jsonData = await convertCsvToJson('./data/sample.csv', columnNames, {
      skipHeader: true, // Skip the first row if it contains headers
      delimiter: ',',
      outputFile: './output/converted.json'
    });
    
    console.log('Converted data:', jsonData);

    // Example 2: Convert from string directly
    const csvString = `1,John Doe,john@example.com,30,New York
2,Jane Smith,jane@example.com,25,Los Angeles
3,Bob Johnson,bob@example.com,35,Chicago`;

    const jsonFromString = CsvToJsonConverter.convertString(csvString, {
      columnNames: ['id', 'name', 'email', 'age', 'city']
    });

    console.log('Converted from string:', jsonFromString);

    // Example 3: With custom delimiter (semicolon)
    const csvWithSemicolon = `1;John Doe;john@example.com;30;New York
2;Jane Smith;jane@example.com;25;Los Angeles`;

    const jsonWithSemicolon = CsvToJsonConverter.convertString(csvWithSemicolon, {
      columnNames: ['id', 'name', 'email', 'age', 'city'],
      delimiter: ';'
    });

    console.log('Converted with semicolon delimiter:', jsonWithSemicolon);

  } catch (error) {
    console.error('Error converting CSV:', error.message);
  }
}

// Uncomment to run the example
// exampleUsage();

export { exampleUsage };