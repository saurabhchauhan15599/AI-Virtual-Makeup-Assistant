import OpenAI from 'openai';

/**
 * Service for OpenAI API integration
 */
class OpenAiService {
  constructor() {
    this.openai = null;
    this.initialized = false;
  }

  /**
   * Initialize the OpenAI API client
   * @param {String} apiKey - OpenAI API key
   * @returns {Boolean} Success status
   */
  initialize(apiKey) {
    if (!apiKey) {
      console.error('OpenAI API key is required');
      return false;
    }

    try {
      this.openai = new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true // Allow API calls from browser
      });
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing OpenAI service:', error);
      return false;
    }
  }

  /**
   * Generate foundation recommendations based on skin analysis
   * @param {Object} skinAnalysis - Skin analysis results
   * @param {Array} topMatches - Top matching foundations
   * @returns {Promise} Promise that resolves with recommendation text
   */
  async getFoundationRecommendations(skinAnalysis, topMatches) {
    if (!this.initialized || !this.openai) {
      throw new Error('OpenAI service not initialized');
    }

    try {
      const prompt = this.createRecommendationPrompt(skinAnalysis, topMatches);
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a professional makeup artist and beauty expert specializing in foundation matching. Provide personalized, detailed recommendations based on skin analysis data."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error generating recommendations:', error);
      throw error;
    }
  }

  /**
   * Create a prompt for foundation recommendations
   * @param {Object} skinAnalysis - Skin analysis results
   * @param {Array} topMatches - Top matching foundations
   * @returns {String} Prompt text
   */
  createRecommendationPrompt(skinAnalysis, topMatches) {
    const { skinTone, undertone } = skinAnalysis;
    
    // Format the top matches for the prompt
    const matchesText = topMatches
      .slice(0, 5) // Use top 5 matches
      .map((match, index) => {
        return `${index + 1}. ${match.brand} ${match.shade}
   - Match Score: ${match.matchDetails.matchScore.toFixed(2)}
   - Undertone: ${match.undertone}
   - LAB Values: [${match.lab.join(', ')}]`;
      })
      .join('\n\n');

    // Create the prompt
    return `
Based on the following skin analysis:
- LAB Values: [${skinTone.join(', ')}]
- Detected Undertone: ${undertone}

Here are the top 5 foundation matches:
${matchesText}

Please provide:
1. A personalized analysis of this skin tone and undertone
2. Detailed explanation of why these foundations match well with this skin tone
3. Your top recommendation from these options and why it's the best choice
4. Any application tips specific to this skin type and foundation
5. Suggestions for complementary makeup products that would work well with this foundation
`;
  }

  /**
   * Generate a conversational response to a user question
   * @param {String} question - User's question
   * @param {Object} context - Context information (skin analysis, selected foundation)
   * @returns {Promise} Promise that resolves with response text
   */
  async getConversationalResponse(question, context) {
    if (!this.initialized || !this.openai) {
      throw new Error('OpenAI service not initialized');
    }

    try {
      const contextPrompt = this.createContextPrompt(context);
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a professional makeup artist and beauty expert. Provide helpful, concise answers to makeup and foundation-related questions."
          },
          {
            role: "user",
            content: `${contextPrompt}\n\nUser question: ${question}`
          }
        ],
        max_tokens: 300,
        temperature: 0.7
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error generating conversational response:', error);
      throw error;
    }
  }

  /**
   * Create a context prompt for conversational responses
   * @param {Object} context - Context information
   * @returns {String} Context prompt text
   */
  createContextPrompt(context) {
    const { skinAnalysis, selectedFoundation } = context;
    
    let contextPrompt = 'Context information:';
    
    if (skinAnalysis) {
      contextPrompt += `\n- Skin tone LAB values: [${skinAnalysis.skinTone.join(', ')}]`;
      contextPrompt += `\n- Detected undertone: ${skinAnalysis.undertone}`;
    }
    
    if (selectedFoundation) {
      contextPrompt += `\n- Selected foundation: ${selectedFoundation.brand} ${selectedFoundation.shade}`;
      contextPrompt += `\n- Foundation undertone: ${selectedFoundation.undertone}`;
    }
    
    return contextPrompt;
  }
}

// Create and export a singleton instance
const openAiService = new OpenAiService();
export default openAiService;