import * as fs from 'fs';
import * as path from 'path';

interface ShadeInfo {
  name: string;
  hex: string;
}

interface ProductOutput {
  sku: string;
  childShades: ShadeInfo[];
}

interface ApiChild {
  id: number;
  title: string;
  catalogue: string;
  barcode: string;
  rrp: number;
  variations: {
    Shade: {
      value: string; // Format: "#hex||Name"
    };
  };
}

interface ApiResponse {
  children: ApiChild[];
  variations: string[];
  parent: number;
}

export class SkuProcessor {
  private baseUrl = 'https://catalogue-service.gslb.io.thehut.local/CatalogueService/product';

  /**
   * Process SKU list from file
   * @param skuFilePath - Path to file containing SKU list (one per line)
   * @param outputPath - Optional output file path
   * @returns Promise<ProductOutput[]>
   */
  async processSkuFile(skuFilePath: string, outputPath?: string): Promise<ProductOutput[]> {
    try {
      const skuContent = fs.readFileSync(skuFilePath, 'utf-8');
      const skuList = skuContent.trim().split('\n').map(sku => sku.trim()).filter(sku => sku);

      return this.processSkuList(skuList, outputPath);
    } catch (error) {
      console.log(error);
      throw new Error(`Failed to read SKU file: ${error.message}`);
    }
  }

  /**
   * Process array of SKUs
   * @param skuList - Array of SKU strings
   * @param outputPath - Optional output file path
   * @returns Promise<ProductOutput[]>
   */
  async processSkuList(skuList: string[], outputPath?: string): Promise<ProductOutput[]> {
    const results: ProductOutput[] = [];

    console.log(`Processing ${skuList.length} SKUs...`);

    for (let i = 0; i < skuList.length; i++) {
      const sku = skuList[i];
      console.log(`Processing SKU ${i + 1}/${skuList.length}: ${sku}`);

      try {
        const productData = await this.fetchProductRelationships(sku);
        const transformedData = this.transformApiResponse(sku, productData);
        results.push(transformedData);

        // Add small delay to avoid overwhelming the API
        await this.delay(100);
      } catch (error) {
        console.log(error);
        console.error(`Error processing SKU ${sku}:`, error.message);
        // Add empty result for failed SKUs
        results.push({
          sku: sku,
          childShades: []
        });
      }
    }

    // Save to file if output path provided
    if (outputPath) {
      this.saveResults(results, outputPath);
    }

    return results;
  }

  /**
   * Fetch product relationships from API
   * @param sku - Product SKU
   * @returns Promise<ApiResponse>
   */
  private async fetchProductRelationships(sku: string): Promise<ApiResponse> {
    const url = `${this.baseUrl}/${sku}/relationships`;
    console.log(url)

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.log(error)
      throw new Error(`Failed to fetch data for SKU ${sku}: ${error.message}`);
    }
  }

  /**
   * Transform API response to desired format
   * @param sku - Original SKU
   * @param apiResponse - API response data
   * @returns ProductOutput
   */
  private transformApiResponse(sku: string, apiResponse: ApiResponse): ProductOutput {
    const childShades: ShadeInfo[] = [];

    if (apiResponse.children && Array.isArray(apiResponse.children)) {
      for (const child of apiResponse.children) {
        if (child.variations && child.variations.Shade && child.variations.Shade.value) {
          const shadeValue = child.variations.Shade.value;
          const [hex, name] = shadeValue.split('||');

          if (hex && name) {
            childShades.push({
              name: name.trim(),
              hex: hex.trim()
            });
          }
        }
      }
    }

    return {
      sku: sku,
      childShades: childShades
    };
  }

  /**
   * Save results to JSON file
   * @param results - Array of processed results
   * @param outputPath - Output file path
   */
  private saveResults(results: ProductOutput[], outputPath: string): void {
    try {
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
      console.log(`Results saved to: ${outputPath}`);
    } catch (error) {
      throw new Error(`Failed to save results: ${error.message}`);
    }
  }

  /**
   * Add delay between API calls
   * @param ms - Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Convenience function for quick usage
export async function processSkuFile(skuFilePath: string, outputPath?: string): Promise<ProductOutput[]> {
  const processor = new SkuProcessor();
  return processor.processSkuFile(skuFilePath, outputPath);
}

export async function processSkuList(skuList: string[], outputPath?: string): Promise<ProductOutput[]> {
  const processor = new SkuProcessor();
  return processor.processSkuList(skuList, outputPath);
}