// Load all items from backend or localStorage
let allItems = [];
let myItems = [];
let selectedMarketItem = null;
let selectedUserItem = null;
let isFullTopup = false;
let useBackend = true;

const itemsGrid = document.getElementById("itemsGrid");
const tradeTypeFilter = document.getElementById("tradeTypeFilter");
const conditionFilter = document.getElementById("conditionFilter");
const minPrice = document.getElementById("minPrice");
const maxPrice = document.getElementById("maxPrice");
const applyFiltersBtn = document.getElementById("applyFilters");

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

// Modal refs
const tradeModal = document.getElementById("tradeModal");
const modalItemImg = document.getElementById("modalItemImg");
const modalItemName = document.getElementById("modalItemName");
const modalItemPrice = document.getElementById("modalItemPrice");
const modalItemCondition = document.getElementById("modalItemCondition");
const userItemSelect = document.getElementById("userItemSelect");
const fullTopupBtn = document.getElementById("fullTopupBtn");
const userItemPreview = document.getElementById("userItemPreview");
const userItemImg = document.getElementById("userItemImg");
const userItemName = document.getElementById("userItemName");
const userItemPrice = document.getElementById("userItemPrice");

// Load items from backend or localStorage
async function loadItems() {
  console.log('[MARKETPLACE] loadItems() called');
  itemsGrid.innerHTML = '<div class="col-span-full text-center py-12"><p class="text-gray-500 text-lg">Loading items...</p></div>';
  
  try {
    // Try to load from backend first
    if (useBackend && window.productsAPI) {
      console.log('[MARKETPLACE] Checking backend availability...');
      const backendAvailable = await checkBackend();
      console.log('[MARKETPLACE] Backend available:', backendAvailable);
      if (backendAvailable) {
        console.log('[MARKETPLACE] Loading items from backend...');
        const response = await productsAPI.getAll();
        console.log('[MARKETPLACE] Backend response:', response);
        
        // Handle nested products array in response
        allItems = response.data?.products || response.data || response.products || response || [];
        console.log('All items loaded:', allItems);
        
        // Load user's own items separately
        try {
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          const userId = user._id || user.id || user.user?._id || user.user?.id;
          
          if (userId) {
            // Filter items by current user
            myItems = allItems.filter(item => 
              (item.seller === userId) || 
              (item.seller?._id === userId) ||
              (item.seller?.id === userId) ||
              (item.userId === userId) ||
              (item.user === userId)
            );
            console.log('My items filtered:', myItems);
          } else {
            myItems = [...allItems]; // Fallback to all items if no user ID
          }
        } catch (userError) {
          console.error('Error getting user info:', userError);
          myItems = [...allItems];
        }
        
        renderItems(allItems);
        return;
      }
    }
  } catch (error) {
    console.error('Error loading from backend:', error);
  }
  
  // Fallback to localStorage
  console.log('Loading from localStorage...');
  allItems = JSON.parse(localStorage.getItem("myItems")) || [];
  myItems = [...allItems];
  console.log('Items from localStorage:', allItems);
  renderItems(allItems);
}

// Render items to grid
function renderItems(items) {
  itemsGrid.innerHTML = "";
  
  if (items.length === 0) {
    itemsGrid.innerHTML = `
      <div class="col-span-full text-center py-12">
        <p class="text-gray-500 text-lg mb-4">No items available in the marketplace</p>
        <a href="post-item.html" class="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Post an Item
        </a>
      </div>
    `;
    return;
  }

  items.forEach(item => {
    const card = document.createElement("div");
    card.className = "bg-white rounded-xl shadow hover:shadow-lg transition p-4";
    
    // Handle both backend and localStorage formats
    const imageUrl = item.images?.[0]?.url || item.image || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="16" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
    // Fix image URL for local uploads - ensure it points to backend server
    const fixedImageUrl = imageUrl.startsWith('http://localhost:5000') ? imageUrl : 
                         imageUrl.startsWith('/uploads/') ? `http://localhost:5000${imageUrl}` :
                         imageUrl.includes('uploads/') ? `http://localhost:5000/${imageUrl}` :
                         imageUrl;
    const itemId = item._id || item.id;
    const itemPrice = item.price || 0;
    const itemCondition = item.condition || 'N/A';
    const itemCategory = item.category || 'N/A';
    const itemTradeType = item.tradeType || 'FullAmount';
    
    card.innerHTML = `
      <img src="${fixedImageUrl}" 
           alt="${item.name}" 
           class="w-full h-40 object-cover rounded-md mb-3"
           onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Crect fill=%22%23ddd%22 width=%22200%22 height=%22200%22/%3E%3Ctext fill=%22%23999%22 font-family=%22sans-serif%22 font-size=%2216%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22%3ENo Image%3C/text%3E%3C/svg%3E'">
      <h4 class="text-lg font-semibold">${item.name}</h4>
      <p class="text-gray-600 font-bold">Ksh ${itemPrice.toLocaleString()}</p>
      <p class="text-sm text-gray-500">Condition: ${itemCondition}</p>
      <p class="text-sm text-gray-500">Category: ${itemCategory}</p>
      <p class="text-xs text-blue-600 mt-1">${itemTradeType}</p>
      <div class="mt-3 flex gap-2">
        <button onclick="openModal('${itemId}')" class="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
          🔄 Trade
        </button>
        <button onclick="openFlagModal('${itemId}')" class="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200" title="Report pricing issue">
          🚩
        </button>
      </div>
    `;
    itemsGrid.appendChild(card);
  });
}

// Apply filters
function applyFilters() {
  const tradeType = tradeTypeFilter.value;
  const condition = conditionFilter.value;
  const minPriceVal = parseInt(minPrice.value) || 0;
  const maxPriceVal = parseInt(maxPrice.value) || Infinity;

  let filtered = allItems.filter(item => {
    // Trade type filter
    const matchesTradeType = tradeType === "all" || 
      (tradeType === "full" && item.tradeType === "FullAmount") ||
      (tradeType === "topup" && item.tradeType === "TopUp") ||
      (tradeType === "barter" && item.tradeType === "Barter");

    // Condition filter
    const matchesCondition = condition === "all" || 
      item.condition.toLowerCase() === condition.toLowerCase();

    // Price filter
    const matchesPrice = item.price >= minPriceVal && item.price <= maxPriceVal;

    return matchesTradeType && matchesCondition && matchesPrice;
  });

  renderItems(filtered);
}

// Open modal
function openModal(itemId) {
  console.log('[MARKETPLACE] openModal called with itemId:', itemId);
  console.log('[MARKETPLACE] Total items available:', allItems.length);
  
  selectedMarketItem = allItems.find(item => (item._id || item.id).toString() === itemId.toString());
  
  if (!selectedMarketItem) {
    console.error('[MARKETPLACE] Item not found with ID:', itemId);
    if (window.ModalUtils) {
      window.ModalUtils.showError("Item not found!");
    } else {
      alert("Item not found!");
    }
    return;
  }
  
  console.log('[MARKETPLACE] Selected item:', selectedMarketItem.name);

  // Populate modal with selected item
  const imageUrl = selectedMarketItem.images?.[0]?.url || selectedMarketItem.image || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="16" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
  // Fix image URL for local uploads - ensure it points to backend server
  const fixedModalImageUrl = imageUrl.startsWith('http://localhost:5000') ? imageUrl : 
                             imageUrl.startsWith('/uploads/') ? `http://localhost:5000${imageUrl}` :
                             imageUrl.includes('uploads/') ? `http://localhost:5000/${imageUrl}` :
                             imageUrl;
  const itemPrice = selectedMarketItem.price || 0;
  const itemCondition = selectedMarketItem.condition || 'N/A';
  
  modalItemImg.src = fixedModalImageUrl;
  modalItemName.textContent = selectedMarketItem.name;
  modalItemPrice.textContent = `Ksh ${itemPrice.toLocaleString()}`;
  modalItemCondition.textContent = `Condition: ${itemCondition}`;

  // Populate user items dropdown
  userItemSelect.innerHTML = `<option value="">-- Select Your Item --</option>`;
  
  // Filter out the selected item from user's items
  const currentItemId = (selectedMarketItem._id || selectedMarketItem.id).toString();
  const userOwnItems = myItems.filter(item => (item._id || item.id).toString() !== currentItemId);
  
  if (userOwnItems.length === 0) {
    userItemSelect.innerHTML += `<option value="" disabled>You have no items to trade</option>`;
  } else {
    userOwnItems.forEach(item => {
      const itemId = item._id || item.id;
      const itemPrice = item.price || 0;
      const itemCondition = item.condition || 'N/A';
      userItemSelect.innerHTML += `
        <option value="${itemId}">
          ${item.name} - Ksh ${itemPrice.toLocaleString()} (${itemCondition})
        </option>
      `;
    });
  }

  // Reset selection
  selectedUserItem = null;
  isFullTopup = false;
  userItemPreview.classList.add("hidden");
  document.getElementById("priceComparison").classList.add("hidden");

  // Show modal
  console.log('[MARKETPLACE] Opening trade modal');
  tradeModal.classList.remove("hidden");
  console.log('[MARKETPLACE] Modal opened successfully');
}

function closeModal() {
  tradeModal.classList.add("hidden");
  selectedMarketItem = null;
  selectedUserItem = null;
  isFullTopup = false;
  userItemPreview.classList.add("hidden");
  document.getElementById("priceComparison").classList.add("hidden");
}

// Show item comparison when user selects their item
function showItemComparison() {
  const selectedId = userItemSelect.value;
  
  if (!selectedId) {
    userItemPreview.classList.add("hidden");
    document.getElementById("priceComparison").classList.add("hidden");
    selectedUserItem = null;
    isFullTopup = false;
    return;
  }
  
  selectedUserItem = myItems.find(item => (item._id || item.id).toString() === selectedId.toString());
  isFullTopup = false;
  
  if (selectedUserItem) {
    // Show user item preview
    const itemImage = selectedUserItem.images?.[0]?.url || selectedUserItem.image || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="16" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
    // Fix image URL for local uploads - ensure it points to backend server
    const fixedUserImageUrl = itemImage.startsWith('http://localhost:5000') ? itemImage : 
                              itemImage.startsWith('/uploads/') ? `http://localhost:5000${itemImage}` :
                              itemImage.includes('uploads/') ? `http://localhost:5000/${itemImage}` :
                              itemImage;
    const itemPrice = selectedUserItem.price || 0;
    userItemImg.src = fixedUserImageUrl;
    userItemName.textContent = selectedUserItem.name;
    userItemPrice.textContent = `Ksh ${itemPrice.toLocaleString()}`;
    userItemPreview.classList.remove("hidden");
    
    // Show price comparison
    const marketPrice = selectedMarketItem.price || 0;
    showPriceComparison(marketPrice, itemPrice);
  }
}

// Select full topup option
function selectFullTopup() {
  isFullTopup = true;
  selectedUserItem = null;
  userItemSelect.value = "";
  userItemPreview.classList.add("hidden");
  
  // Show price comparison for full topup
  const marketPrice = selectedMarketItem.price || 0;
  showPriceComparison(marketPrice, marketPrice, true);
}

// Show price comparison analysis
function showPriceComparison(wantPrice, offerPrice, isFullTopup = false) {
  const comparisonSection = document.getElementById("priceComparison");
  const compareWantPrice = document.getElementById("compareWantPrice");
  const compareOfferPrice = document.getElementById("compareOfferPrice");
  const compareDifference = document.getElementById("compareDifference");
  const topupMessage = document.getElementById("topupMessage");
  
  compareWantPrice.textContent = `Ksh ${wantPrice.toLocaleString()}`;
  compareOfferPrice.textContent = `Ksh ${offerPrice.toLocaleString()}`;
  
  const difference = wantPrice - offerPrice;
  const absDifference = Math.abs(difference);
  
  if (isFullTopup) {
    compareDifference.textContent = `Ksh 0`;
    compareDifference.className = "text-xl font-bold text-green-600";
    topupMessage.classList.remove("hidden");
    topupMessage.querySelector("p").textContent = `✓ You will pay the full price of Ksh ${wantPrice.toLocaleString()}`;
    topupMessage.className = "mt-4 p-3 bg-green-100 border-l-4 border-green-500 rounded";
  } else if (difference > 0) {
    compareDifference.textContent = `+Ksh ${absDifference.toLocaleString()}`;
    compareDifference.className = "text-xl font-bold text-red-600";
    topupMessage.classList.remove("hidden");
    topupMessage.querySelector("p").textContent = `⚠️ You need to top up Ksh ${absDifference.toLocaleString()} to complete this trade`;
    topupMessage.className = "mt-4 p-3 bg-yellow-100 border-l-4 border-yellow-500 rounded";
  } else if (difference < 0) {
    compareDifference.textContent = `-Ksh ${absDifference.toLocaleString()}`;
    compareDifference.className = "text-xl font-bold text-green-600";
    topupMessage.classList.remove("hidden");
    topupMessage.querySelector("p").textContent = `✓ Great deal! Your item is worth Ksh ${absDifference.toLocaleString()} more`;
    topupMessage.className = "mt-4 p-3 bg-green-100 border-l-4 border-green-500 rounded";
  } else {
    compareDifference.textContent = `Ksh 0`;
    compareDifference.className = "text-xl font-bold text-green-600";
    topupMessage.classList.remove("hidden");
    topupMessage.querySelector("p").textContent = `✓ Perfect match! Items have equal value`;
    topupMessage.className = "mt-4 p-3 bg-green-100 border-l-4 border-green-500 rounded";
  }
  
  comparisonSection.classList.remove("hidden");
}

async function confirmTrade() {
  if (!selectedUserItem && !isFullTopup) {
    if (window.ModalUtils) {
      window.ModalUtils.showError("Select your item or choose Full Top-Up.");
    } else {
      alert("Select your item or choose Full Top-Up.");
    }
    return;
  }

  try {
    // Get current user
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user._id || user.id || user.user?._id || user.user?.id;
    
    if (!userId) {
      if (window.ModalUtils) {
        window.ModalUtils.showError("Please log in to create a trade request.", () => {
          window.location.href = 'login.html';
        });
      } else {
        alert("Please log in to create a trade request.");
        window.location.href = 'login.html';
      }
      return;
    }

    // Determine trade type and prepare trade data
    let tradeType;
    let moneyAmount = 0;
    let offeredItemId = null;

    if (isFullTopup) {
      tradeType = 'MoneyOnly';
      moneyAmount = selectedMarketItem.price || 0;
    } else if (selectedUserItem) {
      const userItemPrice = selectedUserItem.price || 0;
      const marketItemPrice = selectedMarketItem.price || 0;
      const difference = marketItemPrice - userItemPrice;

      if (difference > 0) {
        tradeType = 'BarterPlusMoney';
        moneyAmount = difference;
        offeredItemId = selectedUserItem._id || selectedUserItem.id;
      } else {
        tradeType = 'BarterOnly';
        offeredItemId = selectedUserItem._id || selectedUserItem.id;
      }
    }

    const tradeData = {
      requestedItemId: selectedMarketItem._id || selectedMarketItem.id,
      tradeType: tradeType,
      offeredItemId: offeredItemId,
      moneyAmount: moneyAmount
    };

    console.log('Creating trade with data:', tradeData);
    console.log('Checking backend availability...');

    // Check if backend is available
    const backendAvailable = await checkBackend();
    console.log('Backend available:', backendAvailable);
    console.log('tradesAPI exists:', !!window.tradesAPI);
    
    if (backendAvailable && window.tradesAPI) {
      console.log('Sending trade request to:', 'http://localhost:5000/api/v1/trades');
      // Send to backend
      const response = await tradesAPI.create(tradeData);
      console.log('Trade created response:', response);
      
      if (response.success || response.data) {
        if (window.ModalUtils) {
          window.ModalUtils.showSuccess(
            response.message || "Trade request sent successfully! The seller will be notified."
          );
        } else {
          alert("✅ Trade request sent successfully! The seller will be notified.");
        }
        closeModal();
      } else {
        throw new Error(response.message || 'Failed to create trade');
      }
    } else {
      // Fallback to localStorage if backend is not available
      console.warn('Backend not available, saving to localStorage');
      const trades = JSON.parse(localStorage.getItem("trades") || "[]");
      trades.push({
        id: Date.now(),
        requestedItem: selectedMarketItem,
        offeredItem: isFullTopup ? "Full Top-Up" : selectedUserItem,
        tradeType: tradeType,
        moneyAmount: moneyAmount,
        status: "Pending",
        createdAt: new Date().toISOString()
      });
      localStorage.setItem("trades", JSON.stringify(trades));

      if (window.ModalUtils) {
        window.ModalUtils.showSuccess("Trade request saved locally. It will be synced when the backend is available.");
      } else {
        alert("✅ Trade request saved locally. It will be synced when the backend is available.");
      }
      closeModal();
    }
  } catch (error) {
    console.error('Error creating trade:', error);
    if (window.ModalUtils) {
      window.ModalUtils.showError(`Failed to create trade: ${error.message || 'Unknown error'}`);
    } else {
      alert(`❌ Failed to create trade: ${error.message || 'Unknown error'}`);
    }
  }
}

// Flag Modal Functions
let flaggedItem = null;

function openFlagModal(itemId) {
  flaggedItem = allItems.find(item => (item._id || item.id).toString() === itemId.toString());
  
  if (!flaggedItem) {
    if (window.ModalUtils) {
      window.ModalUtils.showError("Item not found!");
    } else {
      alert("Item not found!");
    }
    return;
  }

  // Populate flag modal with item details
  const itemPrice = flaggedItem.price || 0;
  document.getElementById("flagItemName").textContent = flaggedItem.name;
  document.getElementById("flagItemPrice").textContent = `Ksh ${itemPrice.toLocaleString()}`;
  
  // Reset form
  document.getElementById("flagReason").value = "";
  document.getElementById("flagComment").value = "";
  
  // Show modal
  document.getElementById("flagModal").classList.remove("hidden");
}

function closeFlagModal() {
  document.getElementById("flagModal").classList.add("hidden");
  flaggedItem = null;
}

async function submitFlag() {
  const reason = document.getElementById("flagReason").value;
  const comment = document.getElementById("flagComment").value;
  
  if (!reason) {
    if (window.ModalUtils) {
      window.ModalUtils.showError("Please select a reason for reporting this item.");
    } else {
      alert("Please select a reason for reporting this item.");
    }
    return;
  }
  
  if (!flaggedItem) {
    if (window.ModalUtils) {
      window.ModalUtils.showError("No item selected.");
    } else {
      alert("No item selected.");
    }
    return;
  }
  
  try {
    // Get current user
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user._id || user.id || user.user?._id || user.user?.id;
    
    if (!userId) {
      if (window.ModalUtils) {
        window.ModalUtils.showError("Please log in to report items.", () => {
          window.location.href = 'login.html';
        });
      } else {
        alert("Please log in to report items.");
        window.location.href = 'login.html';
      }
      return;
    }
    
    // Prepare flag data
    const flagData = {
      productId: flaggedItem._id || flaggedItem.id,
      reason: reason,
      comment: comment,
      reportedBy: userId,
      productName: flaggedItem.name,
      productPrice: flaggedItem.price
    };
    
    // Check if backend is available
    const backendAvailable = await checkBackend();
    if (backendAvailable && window.api) {
      // Send to backend
      await api.post('/reports', flagData);
      if (window.ModalUtils) {
        window.ModalUtils.showSuccess("Thank you for your report! Our team will review this item.");
      } else {
        alert("✅ Thank you for your report! Our team will review this item.");
      }
    } else {
      // Store locally as fallback
      const reports = JSON.parse(localStorage.getItem('itemReports') || '[]');
      reports.push({
        ...flagData,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('itemReports', JSON.stringify(reports));
      if (window.ModalUtils) {
        window.ModalUtils.showSuccess("Report saved! It will be submitted when the backend is available.");
      } else {
        alert("✅ Report saved! It will be submitted when the backend is available.");
      }
    }
    
    closeFlagModal();
  } catch (error) {
    console.error('Error submitting flag:', error);
    if (window.ModalUtils) {
      window.ModalUtils.showError("Failed to submit report. Please try again.");
    } else {
      alert("Failed to submit report. Please try again.");
    }
  }
}

// Event listeners
applyFiltersBtn.addEventListener("click", applyFilters);

// Initial render
loadItems();
