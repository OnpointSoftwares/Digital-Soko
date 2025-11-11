// Global variables
let currentRequestedItem = null;
let allUserItems = [];
let useBackend = true; // Toggle to use backend API

// Check if backend is available
async function checkBackend() {
  try {
    const response = await fetch('http://localhost:5000/health');
    return response.ok;
  } catch (error) {
    console.warn('Backend not available, using localStorage');
    return false;
  }
}

// Load recent items from backend or localStorage
async function loadRecentItems() {
  const grid = document.getElementById("recentItemsGrid");
  
  try {
    // Try to load from backend first
    if (useBackend && window.productsAPI) {
      const backendAvailable = await checkBackend();
      if (backendAvailable) {
        const response = await productsAPI.getAll({ limit: 6, sort: '-createdAt' });
        // Handle nested products array in response
        allUserItems = response.data?.products || response.data || [];
        renderItems(allUserItems, grid);
        return;
      }
    }
  } catch (error) {
    console.error('Error loading from backend:', error);
  }
  
  // Fallback to localStorage
  const myItems = JSON.parse(localStorage.getItem("myItems")) || [];
  allUserItems = myItems.slice(0, 6);
  renderItems(allUserItems, grid);
}

// Load recent trade requests
async function loadRecentTrades() {
  const grid = document.getElementById("recentTradesGrid");
  
  if (!grid) return;
  
  try {
    // Get current user
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user._id || user.id || user.user?._id || user.user?.id;
    
    if (!userId) {
      grid.innerHTML = '<p class="text-gray-500 text-center py-4">Please log in to view trade requests.</p>';
      return;
    }
    
    if (!window.tradesAPI) {
      grid.innerHTML = '<p class="text-gray-500 text-center py-4">Loading...</p>';
      return;
    }
    
    const backendAvailable = await checkBackend();
    if (!backendAvailable) {
      grid.innerHTML = '<p class="text-gray-500 text-center py-4">Backend not available</p>';
      return;
    }
    
    // Load trades
    const response = await tradesAPI.getMyTrades();
    const allTrades = response.data?.trades || response.data || [];
    
    // Filter for pending trades where current user is the receiver (limit to 3)
    const pendingTrades = allTrades
      .filter(trade => {
        const receiverId = trade.receiver?._id || trade.receiver;
        return receiverId === userId && trade.status === 'pending';
      })
      .slice(0, 3);
    
    if (pendingTrades.length === 0) {
      grid.innerHTML = '<p class="text-gray-500 text-center py-4">No pending trade requests</p>';
      return;
    }
    
    // Render trades
    grid.innerHTML = '';
    pendingTrades.forEach(trade => {
      const card = document.createElement('div');
      card.className = 'bg-white p-4 rounded-lg shadow hover:shadow-md transition';
      
      const offeredItem = trade.offeredProduct?.name || 'Unknown Item';
      const requestedItem = trade.requestedProduct?.name || 'Unknown Item';
      const requesterName = trade.requester?.firstName || 'Unknown';
      const fairnessScore = trade.fairnessAnalysis?.score || 0;
      
      card.innerHTML = `
        <div class="flex justify-between items-center">
          <div class="flex-1">
            <p class="text-sm text-gray-500 mb-1">From: <span class="font-semibold">${requesterName}</span></p>
            <p class="text-sm">
              <span class="font-semibold text-blue-600">${offeredItem}</span>
              <span class="text-gray-500"> for </span>
              <span class="font-semibold text-green-600">${requestedItem}</span>
            </p>
            <span class="inline-block mt-2 px-2 py-1 text-xs rounded-full ${
              fairnessScore >= 80 ? 'bg-green-100 text-green-700' :
              fairnessScore >= 60 ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }">Fairness: ${fairnessScore}%</span>
          </div>
          <a href="barter-requests.html" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            View
          </a>
        </div>
      `;
      
      grid.appendChild(card);
    });
  } catch (error) {
    console.error('Error loading trades:', error);
    grid.innerHTML = '<p class="text-red-500 text-center py-4">Error loading trade requests</p>';
  }
}

// Render items to grid
function renderItems(items, grid) {
  grid.innerHTML = "";
  
  if (items.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full text-center py-12">
        <p class="text-gray-500 text-lg mb-4">No items posted yet</p>
        <a href="post-item.html" class="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Post Your First Item
        </a>
      </div>
    `;
    return;
  }
  
  // Get the 6 most recent items
  const recentItems = items.slice(-6).reverse();
  
  recentItems.forEach(item => {
    const card = document.createElement("div");
    card.className = "bg-white rounded-xl shadow hover:shadow-lg transition p-4";
    
    // Handle both backend and localStorage image formats
    const imageUrl = item.images?.[0]?.url || item.image || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="16" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
    const itemId = item._id || item.id;
    const itemPrice = item.price || 0;
    const itemCondition = item.condition || 'N/A';
    const itemTradeType = item.tradeType || 'FullAmount';
    
    card.innerHTML = `
      <img src="${imageUrl}" 
           alt="${item.name}"
           class="w-full h-40 object-cover rounded-md mb-3"
           onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Crect fill=%22%23ddd%22 width=%22200%22 height=%22200%22/%3E%3Ctext fill=%22%23999%22 font-family=%22sans-serif%22 font-size=%2216%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22%3ENo Image%3C/text%3E%3C/svg%3E'">
      <h4 class="text-lg font-semibold">${item.name}</h4>
      <p class="text-gray-600">Ksh ${itemPrice.toLocaleString()}</p>
      <p class="text-sm text-gray-500 mb-2">Condition: ${itemCondition}</p>
      <span class="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded mb-2">${itemTradeType}</span>
      <button class="trade-btn mt-3 w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              data-item-id="${itemId}">
        Trade Now
      </button>
    `;
    grid.appendChild(card);
  });
  
  // Attach event listeners to trade buttons
  attachTradeButtonListeners();
}

// Attach event listeners to trade buttons
function attachTradeButtonListeners() {
  const tradeButtons = document.querySelectorAll(".trade-btn");
  const modal = document.getElementById("tradeModal");
  
  tradeButtons.forEach(button => {
    button.addEventListener("click", () => {
      const itemId = button.dataset.itemId;
      // Handle both MongoDB ObjectId and localStorage numeric id
      const item = allUserItems.find(i => (i._id || i.id).toString() === itemId.toString());
      
      if (item) {
        currentRequestedItem = item;
        openTradeModal(item);
      }
    });
  });
}

// Open trade modal with item details
function openTradeModal(item) {
  const modal = document.getElementById("tradeModal");
  
  // Handle both backend and localStorage formats
  const imageUrl = item.images?.[0]?.url || item.image || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="16" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
  const itemPrice = item.price || 0;
  const itemTradeType = item.tradeType || 'FullAmount';
  
  // Populate requested item details
  document.getElementById("requestedItemImage").src = imageUrl;
  document.getElementById("requestedItemName").textContent = item.name;
  document.getElementById("requestedItemPrice").textContent = `Ksh ${itemPrice.toLocaleString()}`;
  document.getElementById("requestedItemTradeType").textContent = `Trade Type: ${itemTradeType}`;
  
  // Populate user items dropdown (exclude the requested item)
  const userItemSelect = document.getElementById("userItemSelect");
  userItemSelect.innerHTML = '<option value="">-- Select Your Item --</option>';
  
  const currentItemId = (item._id || item.id).toString();
  
  allUserItems.forEach(userItem => {
    const userItemId = (userItem._id || userItem.id).toString();
    if (userItemId !== currentItemId) {
      const option = document.createElement('option');
      option.value = userItemId;
      const userItemPrice = userItem.price || 0;
      option.textContent = `${userItem.name} (Ksh ${userItemPrice.toLocaleString()})`;
      option.dataset.price = userItemPrice;
      option.dataset.image = userItem.images?.[0]?.url || userItem.image || '';
      userItemSelect.appendChild(option);
    }
  });
  
  // Reset form
  document.getElementById("tradeTypeSelect").value = "";
  document.getElementById("barterSection").classList.add("hidden");
  document.getElementById("moneySection").classList.add("hidden");
  document.getElementById("tradeSummary").classList.add("hidden");
  document.getElementById("userItemDetails").classList.add("hidden");
  document.getElementById("confirmTrade").disabled = true;
  
  modal.classList.remove("hidden");
}

// Trade modal functionality
const modal = document.getElementById("tradeModal");
const closeModalBtn = document.getElementById("closeModal");
const confirmTradeBtn = document.getElementById("confirmTrade");
const tradeTypeSelect = document.getElementById("tradeTypeSelect");
const userItemSelect = document.getElementById("userItemSelect");
const moneyAmountInput = document.getElementById("moneyAmount");

if (closeModalBtn) {
  closeModalBtn.addEventListener("click", () => {
    modal.classList.add("hidden");
    currentRequestedItem = null;
  });
}

// Trade type selection handler
if (tradeTypeSelect) {
  tradeTypeSelect.addEventListener("change", (e) => {
    const tradeType = e.target.value;
    const barterSection = document.getElementById("barterSection");
    const moneySection = document.getElementById("moneySection");
    
    // Show/hide sections based on trade type
    if (tradeType === "BarterOnly" || tradeType === "BarterPlusMoney") {
      barterSection.classList.remove("hidden");
    } else {
      barterSection.classList.add("hidden");
    }
    
    if (tradeType === "MoneyOnly" || tradeType === "BarterPlusMoney") {
      moneySection.classList.remove("hidden");
    } else {
      moneySection.classList.add("hidden");
    }
    
    updateTradeSummary();
  });
}

// User item selection handler
if (userItemSelect) {
  userItemSelect.addEventListener("change", (e) => {
    const selectedItemId = e.target.value;
    
    if (selectedItemId) {
      const selectedItem = allUserItems.find(item => (item._id || item.id).toString() === selectedItemId);
      if (selectedItem) {
        // Show item details
        const itemImage = selectedItem.images?.[0]?.url || selectedItem.image || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="16" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
        const itemPrice = selectedItem.price || 0;
        document.getElementById("userItemImage").src = itemImage;
        document.getElementById("userItemName").textContent = selectedItem.name;
        document.getElementById("userItemPrice").textContent = `Ksh ${itemPrice.toLocaleString()}`;
        document.getElementById("userItemDetails").classList.remove("hidden");
      }
    } else {
      document.getElementById("userItemDetails").classList.add("hidden");
    }
    
    updateTradeSummary();
  });
}

// Money amount input handler
if (moneyAmountInput) {
  moneyAmountInput.addEventListener("input", () => {
    updateTradeSummary();
  });
}

// Update trade summary and calculate fairness
function updateTradeSummary() {
  const tradeType = tradeTypeSelect.value;
  const userItemId = userItemSelect.value;
  const moneyAmount = parseFloat(moneyAmountInput.value) || 0;
  
  if (!tradeType || !currentRequestedItem) {
    document.getElementById("tradeSummary").classList.add("hidden");
    confirmTradeBtn.disabled = true;
    return;
  }
  
  let offeringValue = 0;
  let offeringText = "";
  let isValid = false;
  
  // Calculate offering value based on trade type
  if (tradeType === "BarterOnly") {
    if (userItemId) {
      const userItem = allUserItems.find(item => (item._id || item.id).toString() === userItemId);
      if (userItem) {
        offeringValue = userItem.price || 0;
        offeringText = `${userItem.name} (Ksh ${offeringValue.toLocaleString()})`;
        isValid = true;
      }
    }
  } else if (tradeType === "MoneyOnly") {
    if (moneyAmount > 0) {
      offeringValue = moneyAmount;
      offeringText = `Ksh ${moneyAmount.toLocaleString()} (Cash)`;
      isValid = true;
    }
  } else if (tradeType === "BarterPlusMoney") {
    if (userItemId && moneyAmount > 0) {
      const userItem = allUserItems.find(item => (item._id || item.id).toString() === userItemId);
      if (userItem) {
        offeringValue = (userItem.price || 0) + moneyAmount;
        offeringText = `${userItem.name} + Ksh ${moneyAmount.toLocaleString()} (Total: Ksh ${offeringValue.toLocaleString()})`;
        isValid = true;
      }
    }
  }
  
  if (!isValid) {
    document.getElementById("tradeSummary").classList.add("hidden");
    confirmTradeBtn.disabled = true;
    return;
  }
  
  // Show trade summary
  const requestingValue = currentRequestedItem.price || 0;
  const valueDiff = offeringValue - requestingValue;
  const diffPercentage = Math.abs((valueDiff / requestingValue) * 100);
  
  document.getElementById("offeringValue").textContent = offeringText;
  document.getElementById("requestingValue").textContent = `${currentRequestedItem.name} (Ksh ${requestingValue.toLocaleString()})`;
  
  const valueDiffElement = document.getElementById("valueDifference");
  if (valueDiff > 0) {
    valueDiffElement.textContent = `+Ksh ${Math.abs(valueDiff).toLocaleString()} (You're offering more)`;
    valueDiffElement.className = "font-bold text-green-600";
  } else if (valueDiff < 0) {
    valueDiffElement.textContent = `-Ksh ${Math.abs(valueDiff).toLocaleString()} (You're offering less)`;
    valueDiffElement.className = "font-bold text-red-600";
  } else {
    valueDiffElement.textContent = "Ksh 0 (Equal value)";
    valueDiffElement.className = "font-bold text-blue-600";
  }
  
  // Show fairness alert if difference is > 30%
  const fairnessAlert = document.getElementById("fairnessAlert");
  if (diffPercentage > 30) {
    fairnessAlert.classList.remove("hidden");
  } else {
    fairnessAlert.classList.add("hidden");
  }
  
  document.getElementById("tradeSummary").classList.remove("hidden");
  confirmTradeBtn.disabled = false;
}

// Confirm trade button handler
if (confirmTradeBtn) {
  confirmTradeBtn.addEventListener("click", async () => {
    const tradeType = tradeTypeSelect.value;
    const userItemId = userItemSelect.value;
    const moneyAmount = parseFloat(moneyAmountInput.value) || 0;
    
    if (!currentRequestedItem || !tradeType) {
      alert("Please complete all required fields");
      return;
    }
    
    // Build trade request object
    let offeringValue = 0;
    let offeredItem = null;
    
    if (tradeType === "BarterOnly" || tradeType === "BarterPlusMoney") {
      offeredItem = allUserItems.find(item => (item._id || item.id).toString() === userItemId.toString());
      if (!offeredItem) {
        alert("Please select an item to trade");
        return;
      }
      offeringValue = offeredItem.price;
    }
    
    if (tradeType === "MoneyOnly" || tradeType === "BarterPlusMoney") {
      if (moneyAmount <= 0) {
        alert("Please enter a valid money amount");
        return;
      }
      offeringValue += moneyAmount;
    }
    
    const requestingValue = currentRequestedItem.price;
    const valueDiff = offeringValue - requestingValue;
    const diffPercentage = Math.abs((valueDiff / requestingValue) * 100);
    const fairnessScore = Math.max(0, 100 - diffPercentage);
    
    try {
      // Try to save to backend first
      const backendAvailable = await checkBackend();
      if (backendAvailable && window.tradesAPI) {
        const tradeData = {
          requestedProduct: currentRequestedItem._id || currentRequestedItem.id,
          offeredProduct: offeredItem ? (offeredItem._id || offeredItem.id) : null,
          cashAmount: moneyAmount,
          tradeType: tradeType,
          message: `Trade request for ${currentRequestedItem.name}`
        };
        
        const response = await tradesAPI.create(tradeData);
        
        // Show success message
        if (window.ModalUtils) {
          window.ModalUtils.showSuccess('Trade request sent successfully!', () => {
            modal.classList.add("hidden");
            currentRequestedItem = null;
            loadRecentTrades(); // Reload trades
          });
        } else {
          alert('Trade request sent successfully!');
          modal.classList.add("hidden");
          currentRequestedItem = null;
          loadRecentTrades();
        }
        return;
      }
    } catch (error) {
      console.error('Error creating trade via backend:', error);
      alert('Error creating trade request. Please try again.');
      return;
    }
    
    // Fallback to localStorage if backend not available
    const tradeRequest = {
      id: Date.now(),
      requestedItem: {
        id: currentRequestedItem._id || currentRequestedItem.id,
        name: currentRequestedItem.name,
        price: currentRequestedItem.price,
        image: currentRequestedItem.images?.[0]?.url || currentRequestedItem.image
      },
      offeredItem: offeredItem ? {
        id: offeredItem._id || offeredItem.id,
        name: offeredItem.name,
        price: offeredItem.price,
        image: offeredItem.images?.[0]?.url || offeredItem.image
      } : null,
      moneyAmount: moneyAmount,
      tradeType: tradeType,
      offeringValue: offeringValue,
      requestingValue: requestingValue,
      valueDifference: valueDiff,
      fairnessScore: fairnessScore.toFixed(1),
      needsReview: diffPercentage > 30,
      status: "Pending",
      date: new Date().toISOString()
    };
    
    // Save to localStorage
    let trades = JSON.parse(localStorage.getItem("trades")) || [];
    trades.push(tradeRequest);
    localStorage.setItem("trades", JSON.stringify(trades));
    
    // Also save to barterRequests for backward compatibility
    let barterRequests = JSON.parse(localStorage.getItem("barterRequests")) || [];
    barterRequests.push({
      selectedItem: currentRequestedItem.name,
      userItem: offeredItem ? offeredItem.name : "Cash Payment",
      moneyAmount: moneyAmount,
      tradeType: tradeType,
      date: tradeRequest.date,
      status: 'pending'
    });
    localStorage.setItem("barterRequests", JSON.stringify(barterRequests));
    
    // Show success message
    alert('Trade request sent successfully!');
    modal.classList.add("hidden");
    currentRequestedItem = null;
  });
}

// Load items when page loads
window.addEventListener("DOMContentLoaded", () => {
  loadRecentItems();
  loadRecentTrades();
});

// Close modal when clicking outside
modal.addEventListener("click", (e) => {
  if (e.target === modal) {
    modal.classList.add("hidden");
    currentRequestedItem = null;
  }
});

