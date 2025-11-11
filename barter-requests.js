// Check backend availability
async function checkBackend() {
  try {
    const response = await fetch('http://localhost:5000/health');
    return response.ok;
  } catch (error) {
    return false;
  }
}

const requestsList = document.getElementById("requestsList");
let trades = [];

// Load trades from backend
async function loadTrades() {
  console.log('loadTrades called'); // Debug log
  const loadingState = document.getElementById("loadingState");
  const emptyState = document.getElementById("emptyState");
  
  // Show loading state
  if (loadingState) loadingState.classList.remove('hidden');
  if (requestsList) requestsList.classList.add('hidden');
  if (emptyState) emptyState.classList.add('hidden');
  
  try {
    console.log('Getting user from localStorage'); // Debug log
    // Get current user
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    console.log('User from localStorage:', user); // Debug log
    
    const userId = user._id || user.id || user.user?._id || user.user?.id;
    console.log('Extracted userId:', userId); // Debug log
    
    if (!userId) {
      console.log('No userId found, showing login prompt'); // Debug log
      if (requestsList) {
        requestsList.innerHTML = `
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p class="text-yellow-800">Please log in to view trade requests.</p>
            <a href="login.html" class="text-blue-600 hover:underline">Login</a>
          </div>
        `;
        requestsList.classList.remove('hidden');
      }
      if (loadingState) loadingState.classList.add('hidden');
      return;
    }
    
    if (!window.tradesAPI) {
      console.error('tradesAPI not available'); // Debug log
      if (requestsList) {
        requestsList.innerHTML = '<p class="text-red-500">API client not available. Please refresh the page.</p>';
        requestsList.classList.remove('hidden');
      }
      if (loadingState) loadingState.classList.add('hidden');
      return;
    }
    
    console.log('Checking backend availability...'); // Debug log
    const backendAvailable = await checkBackend();
    console.log('Backend available:', backendAvailable); // Debug log
    
    if (!backendAvailable) {
      console.error('Backend not available'); // Debug log
      if (requestsList) {
        requestsList.innerHTML = `
          <div class="bg-red-50 border border-red-200 rounded-lg p-4">
            <p class="text-red-800">Backend server is not running or not reachable.</p>
            <p class="text-sm text-gray-600 mt-2">Please ensure the backend server is running:</p>
            <pre class="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">cd Backend && npm run dev</pre>
            <button onclick="loadTrades()" class="mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Retry
            </button>
          </div>
        `;
        requestsList.classList.remove('hidden');
      }
      if (loadingState) loadingState.classList.add('hidden');
      return;
    }
    
    console.log('Fetching trades...'); // Debug log
    // Load trades where user is the receiver (incoming requests)
    let response;
    try {
      response = await tradesAPI.getMyTrades();
      console.log('API Response:', response); // Debug log
    } catch (error) {
      console.error('API Error:', error);
      throw new Error('Failed to fetch trades. Please try again later.');
    } finally {
      // Always hide loading state after API call completes
      if (loadingState) loadingState.classList.add('hidden');
    }
    
    if (!response || !response.data) {
      throw new Error('Invalid response from server');
    }
    
    const allTrades = Array.isArray(response.data) ? response.data : 
                     (response.data.trades || []);
    console.log('All trades:', allTrades); // Debug log
    
    // Filter for pending trades where current user is the seller (receiver)
    trades = allTrades.filter(trade => {
      if (!trade) return false;
      
      // In the Trade model, the seller is the one who receives the trade request
      const sellerId = trade.seller?._id || trade.seller?.id || trade.seller;
      const isSeller = sellerId === userId;
      const isPending = (trade.status || '').toLowerCase() === 'pending';
      
      console.log(`Trade ${trade._id}:`, { sellerId, isSeller, status: trade.status, isPending }); // Debug log
      
      return isSeller && isPending;
    });
    
    console.log('Filtered trades:', trades); // Debug log
    
    if (trades.length === 0) {
      console.log('No trades found, showing empty state'); // Debug log
      if (emptyState) emptyState.classList.remove('hidden');
    } else {
      console.log('Rendering trades...'); // Debug log
      if (requestsList) {
        requestsList.classList.remove('hidden');
        renderTrades();
      }
    }
    
  } catch (error) {
    console.error('Error in loadTrades:', error); // Debug log
    
    if (requestsList) {
      requestsList.innerHTML = `
        <div class="bg-red-50 border border-red-200 rounded-lg p-4">
          <p class="text-red-800 font-medium">Error loading trade requests</p>
          <p class="text-sm text-red-700 mt-1">${error.message || 'Unknown error occurred'}</p>
          <button onclick="loadTrades()" class="mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Retry
          </button>
        </div>
      `;
      requestsList.classList.remove('hidden');
    }
  }
}
    

function renderTrades() {
  requestsList.innerHTML = "";

  if (!Array.isArray(trades) || trades.length === 0) {
    emptyState.classList.remove('hidden');
    requestsList.classList.add('hidden');
    return;
  }

  trades.forEach((trade) => {
    if (!trade) return;
    
    const card = document.createElement("div");
    card.className = "bg-white p-6 rounded-xl shadow hover:shadow-lg transition mb-4";
    
    try {
      // Safely extract trade data with fallbacks
      const tradeId = trade._id || trade.id || 'unknown';
      const status = (trade.status || 'pending').toLowerCase();
      
      // Get requester info (buyer in the Trade model)
      const requester = trade.buyer || {};
      const requesterName = [requester.firstName, requester.lastName]
        .filter(Boolean)
        .join(' ') || 'Unknown User';
      
      // Get requested item info
      const requestedItem = trade.requestedProduct || trade.requestedItem || {};
      const requestedItemName = requestedItem.name || 'Unknown Item';
      const requestedPrice = requestedItem.price || trade.requestingValue || 0;
      
      // Get offered item info
      const offeredItem = trade.offeredProduct || trade.offeredItem || {};
      const offeredItemName = offeredItem.name || 'Unknown Item';
      const offeredPrice = offeredItem.price || trade.offeringValue || 0;
      
      // Get trade details
      const moneyAmount = trade.moneyAmount || trade.topupAmount || 0;
      const tradeType = trade.tradeType || 
                       (moneyAmount > 0 ? 'BarterPlusMoney' : 'BarterOnly');
      
      // Calculate fairness score (if not provided)
      const valueDiff = trade.valueDifference !== undefined ? 
        trade.valueDifference : (offeredPrice + moneyAmount - requestedPrice);
      const diffPercentage = requestedPrice > 0 ? 
        Math.abs((valueDiff / requestedPrice) * 100) : 0;
      const fairnessScore = trade.fairnessScore || 
        Math.max(0, 100 - diffPercentage).toFixed(1);
      
      // Determine fairness class
      const fairnessClass = fairnessScore >= 70 ? 'text-green-600' : 
                           fairnessScore >= 50 ? 'text-yellow-600' : 'text-red-600';
      
      // Build trade description based on type
      let tradeDescription = '';
      if (tradeType === 'MoneyOnly') {
        tradeDescription = `Offering: Ksh ${moneyAmount.toLocaleString()}`;
      } else if (tradeType === 'BarterPlusMoney') {
        tradeDescription = `${offeredItemName} + Ksh ${moneyAmount.toLocaleString()}`;
      } else {
        tradeDescription = offeredItemName;
      }
      
      // Format dates
      const createdAt = trade.createdAt ? 
        new Date(trade.createdAt).toLocaleString() : 'Unknown date';
      
      // Build card HTML
      card.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between gap-4">
          <div class="flex-1">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-lg font-semibold text-gray-800">
                Trade Request <span class="text-sm text-gray-500">#${tradeId.substring(0, 6)}</span>
              </h3>
              <span class="text-xs px-2 py-1 rounded-full ${
                status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                status === 'accepted' || status === 'approved' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }">
                ${status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
            </div>
            
            <div class="space-y-3">
              <div class="flex items-start gap-2">
                <span class="text-gray-500 w-24">Requested:</span>
                <div>
                  <p class="font-medium">${requestedItemName}</p>
                  <p class="text-sm text-gray-600">Value: Ksh ${requestedPrice.toLocaleString()}</p>
                </div>
              </div>
              
              <div class="flex items-start gap-2">
                <span class="text-gray-500 w-24">Offered:</span>
                <div>
                  <p class="font-medium">${tradeDescription}</p>
                  <p class="text-sm text-gray-600">
                    Value: Ksh ${(offeredPrice + moneyAmount).toLocaleString()}
                    ${valueDiff !== 0 ? 
                      `<span class="ml-2 ${valueDiff > 0 ? 'text-green-600' : 'text-red-600'}">
                        (${valueDiff > 0 ? '+' : ''}${valueDiff.toLocaleString()})
                      </span>` : ''
                    }
                  </p>
                </div>
              </div>
              
              <div class="flex items-center gap-2">
                <span class="text-gray-500">Fairness:</span>
                <span class="font-medium ${fairnessClass}">${fairnessScore}%</span>
                ${diffPercentage > 30 ? 
                  '<span class="text-xs text-red-500 ml-2">(Needs Review)</span>' : ''
                }
              </div>
              
              <div class="text-xs text-gray-500 mt-2">
                Requested by ${requesterName} • ${createdAt}
              </div>
            </div>
          </div>
          
          ${status === 'pending' ? `
            <div class="flex flex-col gap-2 mt-4 md:mt-0">
              <button 
                onclick="acceptTrade('${tradeId}')" 
                class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
              >
                <i data-lucide="check" class="w-4 h-4"></i>
                Accept
              </button>
              <button 
                onclick="rejectTrade('${tradeId}')" 
                class="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition flex items-center justify-center gap-2"
              >
                <i data-lucide="x" class="w-4 h-4"></i>
                Reject
              </button>
            </div>
          ` : ''}
        </div>
      `;
      
      // Initialize Lucide icons for this card
      setTimeout(() => {
        if (window.lucide) {
          lucide.createIcons({
            icons: lucide.getIcons(card)
          });
        }
      }, 0);
      
    } catch (error) {
      console.error('Error rendering trade:', error, trade);
      card.innerHTML = `
        <div class="bg-red-50 p-4 rounded-lg">
          <p class="text-red-600 font-medium">Error displaying trade</p>
          <p class="text-sm text-red-500 mt-1">${error.message || 'Unknown error'}</p>
          <pre class="text-xs text-gray-500 mt-2 overflow-auto max-h-20">${JSON.stringify(trade, null, 2)}</pre>
        </div>
      `;
    }
    
    requestsList.appendChild(card);
  });
}

// Accept trade
async function acceptTrade(tradeId) {
  if (!confirm('Are you sure you want to accept this trade?')) return;
  
  try {
    await tradesAPI.approve(tradeId);
    alert('✅ Trade accepted! The requester will be notified.');
    loadTrades();
  } catch (error) {
    console.error('Error accepting trade:', error);
    alert('Failed to accept trade: ' + error.message);
  }
}

// Reject trade
async function rejectTrade(tradeId) {
  if (!confirm('Are you sure you want to reject this trade?')) return;
  
  try {
    await tradesAPI.reject(tradeId, 'Declined by user');
    alert('❌ Trade rejected.');
    loadTrades();
  } catch (error) {
    console.error('Error rejecting trade:', error);
    alert('Failed to reject trade: ' + error.message);
  }
}

// Load trades on page load
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, starting loadTrades...');
  loadTrades();
});
