import * as fs from 'fs';
import * as path from 'path';

interface ProductData {
  sku: string;
  name: string;
  url: string;
  price: string;
  in_stock: string;
  image_url: string;
  categories: string;
  group_id: string;
  Base_price_map: string;
  Is_New_In: string;
  Is_Trending: string;
  RRP_Price_Map: string;
  available_sizes: any;
  brand: string;
  breadcrumbs_Categories: string;
  discount_rrp: string;
  dy_display_price: string;
  new_in_release_date: string;
  price_sale_amount: string;
  review_number: string;
  reviews_stars: string;
  rrp_saving: string;
  sale_price: any;
  childShades?: any[];
}

interface SkuResult {
  sku: string;
  childShades: any[];
}

class JsonMerger {
  private logMessages: string[] = [];

  private log(message: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    this.logMessages.push(logMessage);
    console.log(logMessage);
  }

  private normalizeSkuForComparison(sku: any): string {
    // Convert to string and trim whitespace
    return String(sku).trim().toLowerCase();
  }

  public async mergeJsonFiles(outputJsonPath: string, skuResultsPath: string, outputPath: string): Promise<void> {
    try {
      this.log('Starting JSON merge process...');
      
      // Read both files
      this.log(`Reading output.json from: ${outputJsonPath}`);
      const outputData: ProductData[] = JSON.parse(fs.readFileSync(outputJsonPath, 'utf8'));
      this.log(`Successfully loaded ${outputData.length} products from output.json`);

      this.log(`Reading sku-results.json from: ${skuResultsPath}`);
      const skuResults: SkuResult[] = JSON.parse(fs.readFileSync(skuResultsPath, 'utf8'));
      this.log(`Successfully loaded ${skuResults.length} SKU results from sku-results.json`);

      // Create a map for faster lookup
      this.log('Creating SKU lookup map...');
      const skuMap = new Map<string, any[]>();
      
      let skuMapCount = 0;
      let duplicateSkuCount = 0;
      
      skuResults.forEach((skuResult, index) => {
        const normalizedSku = this.normalizeSkuForComparison(skuResult.sku);
        
        if (skuMap.has(normalizedSku)) {
          duplicateSkuCount++;
          this.log(`WARNING: Duplicate SKU found in sku-results.json at index ${index}: ${skuResult.sku}`);
        } else {
          skuMap.set(normalizedSku, skuResult.childShades || []);
          skuMapCount++;
        }
      });
      
      this.log(`Created SKU map with ${skuMapCount} unique entries`);
      if (duplicateSkuCount > 0) {
        this.log(`WARNING: Found ${duplicateSkuCount} duplicate SKUs in sku-results.json`);
      }

      // Merge data
      this.log('Starting merge process...');
      let matchedCount = 0;
      let unmatchedCount = 0;
      let nullChildShadesCount = 0;
      let emptyChildShadesCount = 0;

      const mergedData: ProductData[] = outputData.map((product, index) => {
        const normalizedSku = this.normalizeSkuForComparison(product.sku);
        
        if (skuMap.has(normalizedSku)) {
          const childShades = skuMap.get(normalizedSku);
          matchedCount++;
          
          if (childShades === null || childShades === undefined) {
            nullChildShadesCount++;
            this.log(`INFO: SKU ${product.sku} has null/undefined childShades`);
          } else if (Array.isArray(childShades) && childShades.length === 0) {
            emptyChildShadesCount++;
          }
          
          return {
            ...product,
            childShades: childShades
          };
        } else {
          unmatchedCount++;
          this.log(`WARNING: No matching SKU found for product ${product.sku} (index: ${index})`);
          return {
            ...product,
            childShades: []
          };
        }
      });

      // Log statistics
      this.log('=== MERGE STATISTICS ===');
      this.log(`Total products processed: ${outputData.length}`);
      this.log(`Successfully matched SKUs: ${matchedCount}`);
      this.log(`Unmatched SKUs: ${unmatchedCount}`);
      this.log(`Products with null childShades: ${nullChildShadesCount}`);
      this.log(`Products with empty childShades: ${emptyChildShadesCount}`);
      this.log(`Match rate: ${((matchedCount / outputData.length) * 100).toFixed(2)}%`);

      // Check for unused SKUs in sku-results.json
      const usedSkus = new Set(outputData.map(p => this.normalizeSkuForComparison(p.sku)));
      const unusedSkus = skuResults.filter(sr => !usedSkus.has(this.normalizeSkuForComparison(sr.sku)));
      
      if (unusedSkus.length > 0) {
        this.log(`WARNING: ${unusedSkus.length} SKUs in sku-results.json were not used:`);
        unusedSkus.slice(0, 10).forEach(sku => {
          this.log(`  - Unused SKU: ${sku.sku}`);
        });
        if (unusedSkus.length > 10) {
          this.log(`  ... and ${unusedSkus.length - 10} more`);
        }
      }

      // Write merged data
      this.log(`Writing merged data to: ${outputPath}`);
      fs.writeFileSync(outputPath, JSON.stringify(mergedData, null, 2));
      this.log(`Successfully wrote ${mergedData.length} products to ${outputPath}`);

      // Write log file
      const logPath = outputPath.replace('.json', '_merge_log.txt');
      fs.writeFileSync(logPath, this.logMessages.join('\n'));
      this.log(`Merge log written to: ${logPath}`);

      this.log('JSON merge process completed successfully!');

    } catch (error) {
      this.log(`ERROR: Failed to merge JSON files: ${error.message}`);
      throw error;
    }
  }
}

// Export for use in other modules
export { JsonMerger };

// CLI usage
if (require.main === module) {
  const merger = new JsonMerger();
  const outputJsonPath = path.join(process.cwd(), 'output.json');
  const skuResultsPath = path.join(process.cwd(), 'sku-results.json');
  const mergedOutputPath = path.join(process.cwd(), 'merged-output.json');

  merger.mergeJsonFiles(outputJsonPath, skuResultsPath, mergedOutputPath)
    .then(() => {
      console.log('Merge completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Merge failed:', error);
      process.exit(1);
    });
}