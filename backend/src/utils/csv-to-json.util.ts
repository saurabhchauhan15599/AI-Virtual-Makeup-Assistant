import * as fs from 'fs';
import * as path from 'path';

export interface CsvToJsonOptions {
  columnNames: string[];
  delimiter?: string;
  skipHeader?: boolean;
  outputFile?: string;
}

export class CsvToJsonConverter {
  /**
   * Convert CSV file to JSON
   * @param csvFilePath - Path to the CSV file
   * @param options - Configuration options
   * @returns Promise<any[]> - Array of JSON objects
   */
  static async convertFile(csvFilePath: string, options: CsvToJsonOptions): Promise<any[]> {
    try {
      const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
      return this.convertString(csvContent, options);
    } catch (error) {
      throw new Error(`Failed to read CSV file: ${error.message}`);
    }
  }

  /**
   * Convert CSV string to JSON
   * @param csvString - CSV content as string
   * @param options - Configuration options
   * @returns any[] - Array of JSON objects
   */
  static convertString(csvString: string, options: CsvToJsonOptions): any[] {
    const { columnNames, delimiter = ',', skipHeader = false } = options;
    
    const lines = csvString.trim().split('\n');
    
    // Skip header row if specified
    const dataLines = skipHeader ? lines.slice(1) : lines;
    
    const jsonArray = dataLines.map((line, index) => {
      const values = this.parseCsvLine(line, delimiter);
      
      if (values.length !== columnNames.length) {
        console.warn(`Row ${index + 1}: Expected ${columnNames.length} columns, got ${values.length}`);
      }
      
      const jsonObject: any = {};
      columnNames.forEach((columnName, i) => {
        jsonObject[columnName] = values[i] || null;
      });
      
      return jsonObject;
    });

    // Save to file if outputFile is specified
    if (options.outputFile) {
      this.saveToFile(jsonArray, options.outputFile);
    }

    return jsonArray;
  }

  /**
   * Parse a single CSV line handling quoted values
   * @param line - CSV line
   * @param delimiter - Column delimiter
   * @returns string[] - Array of values
   */
  private static parseCsvLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  /**
   * Save JSON array to file
   * @param jsonArray - Array of JSON objects
   * @param outputPath - Output file path
   */
  private static saveToFile(jsonArray: any[], outputPath: string): void {
    try {
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(outputPath, JSON.stringify(jsonArray, null, 2));
      console.log(`JSON file saved to: ${outputPath}`);
    } catch (error) {
      throw new Error(`Failed to save JSON file: ${error.message}`);
    }
  }
}

// Example usage function
export function convertCsvToJson(
  csvPath: string, 
  columnNames: string[], 
  options: Partial<CsvToJsonOptions> = {}
): Promise<any[]> {
  return CsvToJsonConverter.convertFile(csvPath, {
    columnNames,
    delimiter: options.delimiter || ',',
    skipHeader: options.skipHeader || false,
    outputFile: options.outputFile
  });
}