// Gemini AI Price Checker Module for Digital Soko
class PriceChecker {
  constructor() {
    // Note: In production, store API key securely (environment variables, backend)
    this.apiKey = 'AIzaSyAcFm9fGHXg-_MYjmmJLtYoIcUMGcF7qYQ'; // Replace with actual API key
    this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
  }

  /**
   * Check if an item price is fair compared to market prices
   * @param {Object} item - Item details
   * @param {string} item.name - Item name
   * @param {string} item.category - Item category
   * @param {string} item.condition - Item condition
   * @param {number} item.price - Item price in KSH
   * @param {string} item.description - Item description (optional)
   * @returns {Promise<Object>} Price analysis result
   */
  async checkPrice(item) {
    try {
      const prompt = this.buildPriceCheckPrompt(item);
      const response = await this.queryGemini(prompt);
      const analysis = this.parseGeminiResponse(response, item.price);
      
      // Show modal with results
      this.showPriceModal(analysis);
      
      return analysis;
    } catch (error) {
      console.error('Price check failed:', error);
      
      // Provide specific error messages based on error type
      let errorMessage = 'Unable to check price at this time. Please try again later.';
      
      if (error.message.includes('503')) {
        errorMessage = '🔧 Gemini AI service is temporarily unavailable. This usually resolves within a few minutes. Please try again shortly.';
      } else if (error.message.includes('429')) {
        errorMessage = '⏱️ Too many requests. Please wait a moment and try again.';
      } else if (error.message.includes('Network error')) {
        errorMessage = '🌐 Network connection issue. Please check your internet connection and try again.';
      } else if (error.message.includes('API key')) {
        errorMessage = '🔑 API configuration issue. Please contact support.';
      }
      
      const errorAnalysis = {
        status: 'error',
        message: errorMessage,
        confidence: 0,
        priceSources: ['Service temporarily unavailable - please try again'],
        shops: ['Service temporarily unavailable - please try again'],
        reasoning: `Error occurred: ${error.message}`,
        marketInsights: 'Price analysis unavailable due to service error'
      };
      
      // Show error modal
      this.showPriceModal(errorAnalysis);
      
      return errorAnalysis;
    }
  }

  /**
   * Show price analysis results in a modal
   */
  showPriceModal(analysis) {
    if (window.PriceCheckerUI && window.PriceCheckerUI.showPriceAnalysis) {
      window.PriceCheckerUI.showPriceAnalysis(analysis);
    } else if (window.ModalUtils) {
      const title = analysis.status === 'error' ? 'Price Check Error' : 'Price Analysis Results';
      const content = this.formatModalContent(analysis);
      window.ModalUtils.showInfo(title, content);
    } else {
      // Fallback to alert
      alert(analysis.message || 'Price analysis completed');
    }
  }

  /**
   * Format analysis data for modal display
   */
  formatModalContent(analysis) {
    if (analysis.status === 'error') {
      return `
        <div class="bg-white rounded-lg shadow-sm border border-red-200 max-h-60 flex flex-col">
          <div class="px-4 py-3 border-b border-red-100 bg-gradient-to-r from-red-50 to-pink-50">
            <h3 class="text-lg font-semibold text-red-800 flex items-center">
              <span class="text-red-600 mr-2">❌</span>
              Price Check Error
            </h3>
          </div>
          <div class="flex-1 p-4 text-center">
            <div class="w-12 h-12 mx-auto mb-3 bg-red-100 rounded-full flex items-center justify-center">
              <span class="text-xl">⚠️</span>
            </div>
            <p class="text-red-700 font-medium">${analysis.message}</p>
          </div>
        </div>
      `;
    }

    const confidence = '⭐'.repeat(Math.floor(analysis.confidence / 2));
    
    return `
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 max-h-60 overflow-y-auto">
        <!-- Header -->
        <div class="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 sticky top-0">
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold text-gray-800 flex items-center">
              <span class="text-blue-600 mr-2">🏪</span>
              Shop Sources & Prices
            </h3>
            <div class="flex items-center space-x-2">
              <div class="text-xs text-gray-500">
                ${confidence} (${analysis.confidence}/10)
              </div>
              <button onclick="this.closest('.modal, [role=dialog]').style.display='none'" class="text-gray-400 hover:text-gray-600 transition-colors p-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        <!-- Content -->
        <div class="p-3">
          ${analysis.priceSources && analysis.priceSources.length > 0 ? `
            <div class="bg-blue-50 rounded-md p-3 border border-blue-100">
              <p class="text-sm text-gray-800 leading-relaxed">
                <span class="font-medium text-blue-700">Shop Sources:</span> 
                ${analysis.priceSources.join(' • ')}
              </p>
            </div>
          ` : `
            <div class="bg-yellow-50 rounded-md p-3 border border-yellow-100">
              <p class="text-sm text-gray-700">
                <span class="text-yellow-600">⚠️</span> No shop sources available from AI analysis.
              </p>
            </div>
          `}
        </div>
        
        <!-- Footer -->
        ${analysis.assessment ? `
          <div class="px-3 py-2 border-t border-gray-100 bg-gray-50 sticky bottom-0">
            <div class="flex items-center justify-between text-xs">
              <div class="flex items-center">
                <span class="font-medium text-gray-700">Assessment:</span>
                <span class="ml-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  analysis.assessment === 'fair' ? 'bg-green-100 text-green-800' :
                  analysis.assessment === 'underpriced' ? 'bg-blue-100 text-blue-800' :
                  'bg-red-100 text-red-800'
                }">${analysis.assessment}</span>
              </div>
              ${analysis.suggestedRange ? `
                <div class="text-gray-600 text-xs">
                  KSH ${analysis.suggestedRange.min?.toLocaleString()} - ${analysis.suggestedRange.max?.toLocaleString()}
                </div>
              ` : ''}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Build prompt for Gemini AI to check item pricing
   */
  buildPriceCheckPrompt(item) {
    return `
You are a price analysis expert for the Kenyan market. Analyze this item quickly and concisely.

Item: ${item.name} (${item.category}, ${item.condition}) - KSH ${item.price.toLocaleString()}

REQUIREMENTS:
1. Keep response brief and focused
2. MANDATORY: Include 3-5 shop sources with actual prices
3. Format sources as "Shop Name - KSH price"

Respond in this exact JSON format:
{
  "assessment": "fair|overpriced|underpriced",
  "marketPriceRange": {"min": number, "max": number},
  "suggestedPrice": {"min": number, "max": number},
  "confidence": number,
  "reasoning": "brief 1-2 sentence explanation",
  "priceSources": [
    "Jumia Kenya - KSH 45000-50000",
    "OLX Kenya - KSH 42000-48000",
    "Jiji.co.ke - KSH 44500",
    "Local shops - KSH 46000",
    "CBD Electronics - KSH 43000-47000"
  ],
  "autoApproval": "approve|reject",
  "approvalReason": "brief reason"
}

CRITICAL: Always include real priceSources array with actual Kenyan shop names and prices.
`;
  }

  /**
   * Query Gemini AI API with retry mechanism
   */
  async queryGemini(prompt, retryCount = 0) {
    const maxRetries = 3;
    const retryDelay = 1000 * (retryCount + 1); // 1s, 2s, 3s delays

    const requestBody = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    };

    try {
      const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Gemini API error ${response.status}:`, errorText);
        
        // Retry on 503 (Service Unavailable) or 429 (Rate Limited)
        if ((response.status === 503 || response.status === 429) && retryCount < maxRetries) {
          console.log(`Retrying API call in ${retryDelay}ms... (attempt ${retryCount + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return this.queryGemini(prompt, retryCount + 1);
        }
        
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to Gemini API. Check your internet connection.');
      }
      throw error;
    }
  }

  /**
   * Parse Gemini response and format for UI
   */
  parseGeminiResponse(responseText, originalPrice) {
    try {
      // Extract JSON from response (Gemini might include extra text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const analysis = JSON.parse(jsonMatch[0]);
      
      // Debug: Log the parsed analysis to see if sources are included
      console.log('Parsed analysis:', analysis);
      console.log('Price sources:', analysis.priceSources);
      console.log('Raw response text:', responseText);
      
      // Force add debug sources if missing
      if (!analysis.priceSources || analysis.priceSources.length === 0) {
        console.warn('AI did not provide priceSources! Adding debug message...');
        analysis.priceSources = ['AI failed to provide shop sources - this is a bug'];
      }
      
      return {
        status: 'success',
        assessment: analysis.assessment,
        originalPrice: originalPrice,
        marketRange: analysis.marketPriceRange,
        suggestedRange: analysis.suggestedPrice,
        confidence: analysis.confidence,
        reasoning: analysis.reasoning,
        marketInsights: analysis.marketInsights,
        priceSources: analysis.priceSources || [],
        shops: analysis.priceSources || [],
        autoApproval: analysis.autoApproval || 'reject',
        approvalReason: analysis.approvalReason || 'Insufficient data for auto-approval',
        message: this.generateUserMessage(analysis, originalPrice)
      };
    } catch (error) {
      console.error('Failed to parse Gemini response:', error);
      return {
        status: 'error',
        message: 'Unable to analyze price data',
        confidence: 0
      };
    }
  }

  /**
   * Generate user-friendly message based on analysis
   */
  generateUserMessage(analysis, originalPrice) {
    const { assessment, suggestedPrice, confidence } = analysis;
    
    if (confidence < 5) {
      return `⚠️ Low confidence analysis. Consider researching similar items manually.`;
    }

    switch (assessment) {
      case 'fair':
        return `✅ Your price (KSH ${originalPrice.toLocaleString()}) appears fair for the market.`;
      
      case 'overpriced':
        const overSavings = originalPrice - suggestedPrice.max;
        return `📈 Your price might be high. Consider KSH ${suggestedPrice.min.toLocaleString()} - ${suggestedPrice.max.toLocaleString()} (save up to KSH ${overSavings.toLocaleString()})`;
      
      case 'underpriced':
        const underGain = suggestedPrice.min - originalPrice;
        return `📉 You might be pricing too low. Consider KSH ${suggestedPrice.min.toLocaleString()} - ${suggestedPrice.max.toLocaleString()} (gain up to KSH ${underGain.toLocaleString()})`;
      
      default:
        return `🤔 Unable to determine price fairness. Market range: KSH ${suggestedPrice.min.toLocaleString()} - ${suggestedPrice.max.toLocaleString()}`;
    }
  }

  /**
   * Quick price check for marketplace items
   */
  async quickPriceCheck(itemName, category, price) {
    const item = {
      name: itemName,
      category: category || 'General',
      condition: 'Used', // Default assumption
      price: price,
      description: ''
    };

    return await this.checkPrice(item);
  }

  /**
   * Check price and automatically approve/reject item posting
   */
  async checkAndAutoApprove(item, onApproved = null, onRejected = null) {
    try {
      const analysis = await this.checkPrice(item);
      
      if (analysis.status === 'error') {
        if (onRejected) onRejected(analysis.message, analysis);
        return { approved: false, reason: analysis.message, analysis };
      }

      const isApproved = this.shouldAutoApprove(analysis);
      
      if (isApproved) {
        if (onApproved) onApproved(analysis.approvalReason, analysis);
        return { approved: true, reason: analysis.approvalReason, analysis };
      } else {
        if (onRejected) onRejected(analysis.approvalReason, analysis);
        return { approved: false, reason: analysis.approvalReason, analysis };
      }
    } catch (error) {
      console.error('Auto-approval check failed:', error);
      const errorMsg = 'Unable to verify price for auto-approval';
      if (onRejected) onRejected(errorMsg, null);
      return { approved: false, reason: errorMsg, analysis: null };
    }
  }

  /**
   * Determine if item should be auto-approved based on analysis
   */
  shouldAutoApprove(analysis) {
    // Auto-approve if:
    // 1. AI explicitly recommends approval
    // 2. High confidence (>= 7) and fair pricing
    // 3. Has reliable data sources
    
    if (analysis.autoApproval === 'approve') {
      return true;
    }
    
    if (analysis.confidence >= 7 && 
        analysis.assessment === 'fair' && 
        analysis.priceSources && 
        analysis.priceSources.length >= 2) {
      return true;
    }
    
    return false;
  }

  /**
   * Batch check multiple items (with rate limiting)
   */
  async batchPriceCheck(items, delayMs = 1000) {
    const results = [];
    
    for (let i = 0; i < items.length; i++) {
      try {
        const result = await this.checkPrice(items[i]);
        results.push({ ...result, itemIndex: i });
        
        // Rate limiting - wait between requests
        if (i < items.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (error) {
        results.push({
          status: 'error',
          message: 'Failed to check price',
          itemIndex: i
        });
      }
    }
    
    return results;
  }
}

// Export for use in other modules
window.PriceChecker = PriceChecker;

// Initialize global instance
window.priceChecker = new PriceChecker();

// Utility functions for UI integration
window.PriceCheckerUI = {
  /**
   * Show price analysis in a modal
   */
  showPriceAnalysis(analysis) {
    if (analysis.status === 'error') {
      if (window.ModalUtils) {
        window.ModalUtils.showError(analysis.message);
      } else {
        alert(`❌ ${analysis.message}`);
      }
      return;
    }

    const confidence = '⭐'.repeat(Math.floor(analysis.confidence / 2));
    // Debug: Force show what we have
    console.log('UI Display Debug - analysis object:', analysis);
    console.log('UI Display Debug - priceSources:', analysis.priceSources);
    console.log('UI Display Debug - shops:', analysis.shops);
    
    // Well-designed modal display with full scrollbar
    const sourcesHtml = `
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 max-h-60 overflow-y-auto">
        <!-- Header -->
        <div class="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 sticky top-0">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-800 flex items-center">
              <span class="text-blue-600 mr-2">🏪</span>
              Price Analysis Results
            </h3>
            <div class="flex items-center space-x-3">
              <div class="text-sm text-gray-500">
                Confidence: ${confidence} (${analysis.confidence}/10)
              </div>
              <button onclick="this.closest('.modal, [role=dialog]').style.display='none'" class="text-gray-400 hover:text-gray-600 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        <!-- Content -->
        <div class="p-4">
          ${analysis.priceSources && analysis.priceSources.length > 0 ? `
            <div class="bg-blue-50 rounded-lg p-3 border border-blue-100">
              <p class="text-sm text-gray-800 leading-relaxed">
                <span class="font-medium text-blue-700">Shop Sources:</span> 
                ${analysis.priceSources.join(' • ')}
              </p>
            </div>
          ` : `
            <div class="bg-yellow-50 rounded-lg p-3 border border-yellow-100">
              <p class="text-sm text-gray-700">
                <span class="text-yellow-600">⚠️</span> No shop sources available from AI analysis.
              </p>
            </div>
          `}
        </div>
        
        <!-- Footer with key info -->
        ${analysis.assessment ? `
          <div class="px-4 py-3 border-t border-gray-100 bg-gray-50 sticky bottom-0">
            <div class="flex items-center justify-between text-sm">
              <div class="flex items-center">
                <span class="font-medium text-gray-700">Assessment:</span>
                <span class="ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                  analysis.assessment === 'fair' ? 'bg-green-100 text-green-800' :
                  analysis.assessment === 'underpriced' ? 'bg-blue-100 text-blue-800' :
                  'bg-red-100 text-red-800'
                }">${analysis.assessment}</span>
              </div>
              ${analysis.suggestedRange ? `
                <div class="text-gray-600">
                  Suggested: <span class="font-medium">KSH ${analysis.suggestedRange.min?.toLocaleString()} - ${analysis.suggestedRange.max?.toLocaleString()}</span>
                </div>
              ` : ''}
            </div>
          </div>
        ` : ''}
      </div>
    `;

    const approvalHtml = `
      <div class="mt-4 p-3 ${analysis.autoApproval === 'approve' ? 'bg-green-50' : 'bg-red-50'} rounded-lg">
        <h4 class="font-semibold ${analysis.autoApproval === 'approve' ? 'text-green-800' : 'text-red-800'} mb-2">
          ${analysis.autoApproval === 'approve' ? '✅ Auto-Approval: APPROVED' : '❌ Auto-Approval: REJECTED'}
        </h4>
        <p class="text-sm ${analysis.autoApproval === 'approve' ? 'text-green-700' : 'text-red-700'}">
          ${analysis.approvalReason}
        </p>
      </div>
    `;
    
    const content = `
      <div class="text-left space-y-4">
        <div class="text-center mb-4">
          <p class="text-lg font-medium text-gray-800">${analysis.message}</p>
        </div>
        
        <div class="bg-gray-50 p-4 rounded-lg">
          <h4 class="font-semibold text-gray-800 mb-2">📊 Market Analysis:</h4>
          <ul class="text-sm text-gray-700 space-y-1">
            <li>• <strong>Market Range:</strong> KSH ${analysis.marketRange.min.toLocaleString()} - ${analysis.marketRange.max.toLocaleString()}</li>
            <li>• <strong>Confidence:</strong> ${confidence} (${analysis.confidence}/10)</li>
            <li>• <strong>Reason:</strong> ${analysis.reasoning}</li>
          </ul>
        </div>
        
        <div class="bg-green-50 p-4 rounded-lg">
          <h4 class="font-semibold text-green-800 mb-2">💡 Market Insights:</h4>
          <p class="text-sm text-green-700">${analysis.marketInsights}</p>
        </div>
        
        ${sourcesHtml}
        
        ${approvalHtml}
      </div>
    `;

    if (window.ModalUtils) {
      window.ModalUtils.showInfo('Price Analysis Results', content);
    } else {
      this.showModal('Price Analysis Results', content, 'info');
    }
  },

  /**
   * Show modal dialog (replaces alert)
   */
  showModal(title, content, type = 'info') {
    // Remove existing modal if any
    const existingModal = document.getElementById('priceCheckerModal');
    if (existingModal) {
      existingModal.remove();
    }

    const iconColor = type === 'error' ? 'text-red-600' : 'text-blue-600';
    const iconBg = type === 'error' ? 'bg-red-100' : 'bg-blue-100';
    const buttonColor = type === 'error' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700';
    
    const icon = type === 'error' 
      ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>'
      : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>';

    const modalHtml = `
      <div id="priceCheckerModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-2xl shadow-2xl p-6 w-11/12 max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center">
              <div class="w-10 h-10 ${iconBg} rounded-full flex items-center justify-center mr-3">
                <svg class="w-6 h-6 ${iconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  ${icon}
                </svg>
              </div>
              <h3 class="text-xl font-bold text-gray-800">${title}</h3>
            </div>
            <button onclick="document.getElementById('priceCheckerModal').remove()" class="text-gray-400 hover:text-gray-600">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          <div class="mb-6">
            ${content}
          </div>
          <div class="flex justify-end">
            <button onclick="document.getElementById('priceCheckerModal').remove()" 
                    class="px-6 py-3 ${buttonColor} text-white rounded-lg font-semibold transition">
              Close
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
  },

  /**
   * Create price analysis badge for items
   */
  createPriceBadge(analysis) {
    if (analysis.status === 'error') return '';

    const badgeClass = {
      'fair': 'bg-green-100 text-green-800',
      'overpriced': 'bg-red-100 text-red-800', 
      'underpriced': 'bg-blue-100 text-blue-800'
    }[analysis.assessment] || 'bg-gray-100 text-gray-800';

    const icon = {
      'fair': '✅',
      'overpriced': '📈',
      'underpriced': '📉'
    }[analysis.assessment] || '🤔';

    return `
      <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badgeClass}">
        ${icon} ${analysis.assessment.charAt(0).toUpperCase() + analysis.assessment.slice(1)} Price
      </span>
    `;
  },

  /**
   * Add price check button to forms
   */
  addPriceCheckButton(formElement, onCheck) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm';
    button.innerHTML = '🤖 Check Price with AI';
    button.onclick = onCheck;
    
    formElement.appendChild(button);
    return button;
  }
};
