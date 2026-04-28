import { SkuProcessor, processSkuFile, processSkuList } from './sku-processor';

// Example usage of the SKU processor

async function exampleUsage() {
  try {
    // Example 1: Process SKUs from file
    console.log('=== Processing SKUs from file ===');
    const resultsFromFile = await processSkuFile('./sku_list.txt', './output/sku-results.json');
    console.log('Results from file:', JSON.stringify(resultsFromFile, null, 2));

    // Example 2: Process SKUs from array
    console.log('\n=== Processing SKUs from array ===');
    const skuArray = ['13321961', '13321962', '13321963'];
    const resultsFromArray = await processSkuList(skuArray, './output/sku-array-results.json');
    console.log('Results from array:', JSON.stringify(resultsFromArray, null, 2));

    // Example 3: Using the class directly for more control
    console.log('\n=== Using SkuProcessor class directly ===');
    const processor = new SkuProcessor();
    const singleSkuResults = await processor.processSkuList(['13321961']);
    console.log('Single SKU result:', JSON.stringify(singleSkuResults, null, 2));

  } catch (error) {
    console.error('Error processing SKUs:', error.message);
  }
}

// Example of expected output format:
const expectedOutput = {
  sku: "13321961",
  childShades: [
    { name: "Dreamy", hex: "#a24055" },
    { name: "Peachy", hex: "#db9c8c" },
    { name: "Poppy", hex: "#de675b" },
    { name: "Rosy", hex: "#cd8273" },
    { name: "Chilly", hex: "#B65A65" },
    { name: "Spicy", hex: "#9D432C" },
    { name: "Sweetie", hex: "#ef6079" },
    { name: "Baby", hex: "#EF95CF" },
    { name: "Cutie", hex: "#b66c6d" },
    { name: "Hottie", hex: "#FF6D6A" },
    { name: "Flirty", hex: "#FF5869" },
    { name: "Lady", hex: "#E48F93" }
  ]
};

console.log('Expected output format:', JSON.stringify(expectedOutput, null, 2));

// Uncomment to run the example
// exampleUsage();

export { exampleUsage, expectedOutput };