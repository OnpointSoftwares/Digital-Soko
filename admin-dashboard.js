// Admin Dashboard JavaScript
let allItems = [];
let allTrades = [];
let allReports = [];
let itemToDelete = null;

// Load data on page load
document.addEventListener("DOMContentLoaded", () => {
  checkAdminAuth();
  setupTabNavigation();
});

// Check admin authentication and redirect if needed
async function checkAdminAuth() {
  try {
    // Check if user is logged in
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    const token = localStorage.getItem('token');

    if (!isLoggedIn || !token) {
      console.log('No authentication found, redirecting to login');
      window.location.href = 'login.html';
      return;
    }

    // Check if user has admin role
    if (userData.role !== 'admin') {
      console.log('User is not admin, redirecting to regular dashboard');
      window.location.href = 'dashboard.html';
      return;
    }

    // Set the token in API client
    if (typeof window.api !== 'undefined') {
      window.api.setToken(token);
    }

    console.log('Admin authenticated, loading dashboard data...');
    await loadDashboardData();
  } catch (error) {
    console.error('Auth check failed:', error);
    window.location.href = 'login.html';
  }
}

// Load all dashboard data
async function loadDashboardData() {
  try {
    // Try to load from backend first (prioritize MongoDB)
    const backendAvailable = await checkBackend();
    if (backendAvailable && typeof window.productsAPI !== 'undefined' && 
        typeof window.tradesAPI !== 'undefined' && typeof window.reportsAPI !== 'undefined') {
      await loadFromBackend();
    } else {
      throw new Error('Backend or API not available');
    }
  } catch (error) {
    console.warn('Backend not available, falling back to localStorage:', error.message);
    // Only fallback to localStorage if backend fails
    loadFromLocalStorage();
  }
}

// Load data from backend
async function loadFromBackend() {
  try {
    // Load products
    const productsResponse = await window.productsAPI.getAll();
    allItems = productsResponse.data?.products || productsResponse.data || [];

    // Load trades
    const tradesResponse = await window.tradesAPI.getAll();
    allTrades = tradesResponse.data?.trades || tradesResponse.data || [];

    // Load reports
    const reportsResponse = await window.reportsAPI.getAll();
    allReports = reportsResponse.data?.reports || reportsResponse.data || [];

    updateStatistics();
    renderItemsTable();
    renderTradesTable();
    renderReportsTable();
    renderAnalytics();
  } catch (error) {
    console.error('Error loading from backend:', error);
    loadFromLocalStorage();
  }
}

// Load data from localStorage (fallback)
function loadFromLocalStorage() {
  allItems = JSON.parse(localStorage.getItem("myItems")) || [];
  allTrades = JSON.parse(localStorage.getItem("trades")) || [];
  allReports = JSON.parse(localStorage.getItem("itemReports")) || [];

  updateStatistics();
  renderItemsTable();
  renderTradesTable();
  renderReportsTable();
  renderAnalytics();
}

// Check backend availability
async function checkBackend() {
  try {
    const response = await fetch('http://localhost:5000/health');
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Tab navigation
function setupTabNavigation() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');

      // Remove active state from all buttons
      tabButtons.forEach(b => {
        b.classList.remove('border-purple-600', 'text-purple-600');
        b.classList.add('text-gray-600');
      });

      // Add active state to clicked button
      btn.classList.add('border-purple-600', 'text-purple-600');
      btn.classList.remove('text-gray-600');

      // Hide all tab contents
      tabContents.forEach(content => content.classList.add('hidden'));

      // Show target tab content
      const targetContent = document.getElementById(`${targetTab}-tab`);
      if (targetContent) {
        targetContent.classList.remove('hidden');
      }
    });
  });
}

// Update statistics cards
function updateStatistics() {
  const totalItems = allItems.length;
  const activeTrades = allTrades.filter(t => t.status === "Pending").length;
  const pendingRequests = allTrades.filter(t => t.status === "Pending").length;

  // Calculate flagged trades (trades with >30% price difference)
  const flaggedTrades = allTrades.filter(t => {
    const requestedPrice = t.requestedItem?.price || t.requestingValue || 0;
    const offeredValue = t.offeringValue || 0;
    const valueDiff = t.valueDifference || (offeredValue - requestedPrice);
    const diffPercentage = requestedPrice > 0 ? Math.abs((valueDiff / requestedPrice) * 100) : 0;
    return diffPercentage > 30 && t.status === "Pending";
  }).length;

  // Reports statistics
  const totalReports = allReports.length;
  const pendingReports = allReports.filter(r => r.status === "pending").length;

  // Reports by reason
  const overpricedCount = allReports.filter(r => r.reason === "overpriced").length;
  const underpricedCount = allReports.filter(r => r.reason === "underpriced").length;
  const misleadingCount = allReports.filter(r => r.reason === "misleading").length;
  const otherCount = allReports.filter(r => r.reason === "other").length;

  // Update DOM elements with null checks
  const elements = {
    totalItems: document.getElementById("totalItems"),
    activeTrades: document.getElementById("activeTrades"),
    pendingRequests: document.getElementById("pendingRequests"),
    pendingReports: document.getElementById("pendingReports"),
    flaggedTradesCount: document.getElementById("flaggedTradesCount"),
    pendingTradesCount: document.getElementById("pendingTradesCount"),
    totalReports: document.getElementById("totalReports"),
    pendingReportsTab: document.getElementById("pendingReportsTab"),
    resolvedReports: document.getElementById("resolvedReports"),
    overpricedCount: document.getElementById("overpricedCount"),
    underpricedCount: document.getElementById("underpricedCount"),
    misleadingCount: document.getElementById("misleadingCount"),
    otherCount: document.getElementById("otherCount")
  };

  // Update only existing elements
  if (elements.totalItems) elements.totalItems.textContent = totalItems;
  if (elements.activeTrades) elements.activeTrades.textContent = activeTrades;
  if (elements.pendingRequests) elements.pendingRequests.textContent = pendingRequests;

  // Update trade counts in Trades Monitor tab
  if (elements.flaggedTradesCount) elements.flaggedTradesCount.textContent = flaggedTrades;
  if (elements.pendingTradesCount) elements.pendingTradesCount.textContent = pendingRequests;

  // Update reports statistics
  if (elements.pendingReports) elements.pendingReports.textContent = pendingReports;
  if (elements.totalReports) elements.totalReports.textContent = totalReports;
  if (elements.pendingReportsTab) elements.pendingReportsTab.textContent = pendingReports;
  if (elements.resolvedReports) elements.resolvedReports.textContent = allReports.filter(r => r.status === "resolved").length;

  // Update reason breakdown
  if (elements.overpricedCount) elements.overpricedCount.textContent = overpricedCount;
  if (elements.underpricedCount) elements.underpricedCount.textContent = underpricedCount;
  if (elements.misleadingCount) elements.misleadingCount.textContent = misleadingCount;
  if (elements.otherCount) elements.otherCount.textContent = otherCount;
}

// Render items table
function renderItemsTable() {
  const tbody = document.getElementById("itemsTableBody");

  if (allItems.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-8 text-gray-500">No items found</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = allItems.map(item => `
    <tr class="hover:bg-gray-50">
      <td class="border p-3">#${item.id}</td>
      <td class="border p-3">
        <img src="${item.image || 'https://via.placeholder.com/50'}"
             alt="${item.name}"
             class="w-12 h-12 object-cover rounded"
             onerror="this.src='https://via.placeholder.com/50'">
      </td>
      <td class="border p-3 font-semibold">${item.name}</td>
      <td class="border p-3">Ksh ${item.price.toLocaleString()}</td>
      <td class="border p-3">
        <span class="px-2 py-1 rounded text-xs ${item.condition === 'New' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
          ${item.condition}
        </span>
      </td>
      <td class="border p-3">${item.category || 'N/A'}</td>
      <td class="border p-3">
        <span class="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
          ${item.tradeType || 'Full Amount'}
        </span>
      </td>
      <td class="border p-3">
        <div class="flex gap-2">
          <button onclick="viewItem(${item.id})" class="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600">
            👁️ View
          </button>
          <button onclick="deleteItem(${item.id})" class="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600">
            🗑️ Delete
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Render trades table with enhanced details
function renderTradesTable() {
  const tbody = document.getElementById("tradesTableBody");

  if (!allTrades || allTrades.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-8 text-gray-500">No trades found</td>
      </tr>
    `;
    return;
  }

  console.log('Rendering trades:', allTrades); // Debug log

  tbody.innerHTML = allTrades.map(trade => {
    try {
      // Safely get trade properties with fallbacks
      const tradeId = trade._id || trade.id || 'N/A';
      const tradeStatus = trade.status || 'Pending';
      
      // Handle requested item
      const requestedItem = trade.requestedItem || {};
      const requestedItemName = requestedItem.name || 'Unknown Item';
      const requestedPrice = requestedItem.price || trade.requestingValue || 0;

      // Handle offered item and trade type
      let offeredDescription = 'N/A';
      let offeredValue = 0;
      let tradeType = trade.tradeType || 'BarterOnly'; // Default to BarterOnly if not specified

      if (trade.tradeType === 'MoneyOnly' || trade.moneyAmount > 0) {
        tradeType = 'MoneyOnly';
        offeredDescription = `Cash: Ksh ${(trade.moneyAmount || 0).toLocaleString()}`;
        offeredValue = trade.moneyAmount || 0;
      } 
      else if (trade.offeredItem) {
        const offeredItem = trade.offeredItem;
        const itemName = offeredItem.name || 'Item';
        const itemPrice = offeredItem.price || 0;
        
        if (trade.moneyAmount > 0) {
          tradeType = 'BarterPlusMoney';
          offeredDescription = `${itemName} + Ksh ${trade.moneyAmount.toLocaleString()}`;
          offeredValue = itemPrice + trade.moneyAmount;
        } else {
          tradeType = 'BarterOnly';
          offeredDescription = itemName;
          offeredValue = itemPrice;
        }
      }

      // Calculate value difference and fairness score
      const valueDiff = trade.valueDifference !== undefined ? trade.valueDifference : (offeredValue - requestedPrice);
      const diffPercentage = requestedPrice > 0 ? Math.abs((valueDiff / requestedPrice) * 100) : 0;
      const fairnessScore = trade.fairnessScore || Math.max(0, 100 - diffPercentage).toFixed(1);
      const needsReview = trade.needsReview || diffPercentage > 30;

      return `
        <tr class="hover:bg-gray-50 ${needsReview ? 'bg-red-50' : ''}" data-trade-id="${tradeId}">
          <td class="border p-3">#${tradeId}</td>
          <td class="border p-3">
            <div class="font-semibold">${requestedItemName}</div>
            <div class="text-xs text-gray-600">Ksh ${Number(requestedPrice).toLocaleString()}</div>
          </td>
          <td class="border p-3">
            <div class="text-sm">${offeredDescription}</div>
            <div class="text-xs text-gray-600">Total: Ksh ${Number(offeredValue).toLocaleString()}</div>
          </td>
          <td class="border p-3">
            <span class="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
              ${tradeType}
            </span>
          </td>
          <td class="border p-3 text-center">
            <div class="font-semibold ${valueDiff >= 0 ? 'text-green-600' : 'text-red-600'}">
              ${valueDiff >= 0 ? '+' : ''}Ksh ${Math.abs(valueDiff).toLocaleString()}
            </div>
            <div class="text-xs text-gray-500">${diffPercentage.toFixed(1)}%</div>
          </td>
          <td class="border p-3 text-center">
            <div class="font-bold ${fairnessScore >= 70 ? 'text-green-600' : fairnessScore >= 50 ? 'text-yellow-600' : 'text-red-600'}">
              ${fairnessScore}%
            </div>
            ${needsReview ? '<div class="text-xs text-red-600 font-semibold">⚠️ Review</div>' : ''}
          </td>
          <td class="border p-3">
            <span class="px-2 py-1 rounded text-xs ${
              tradeStatus === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
              tradeStatus === 'Approved' ? 'bg-green-100 text-green-800' :
              'bg-red-100 text-red-800'
            }">
              ${tradeStatus}
            </span>
          </td>
          <td class="border p-3">
            <div class="flex gap-2">
              <button onclick="viewTradeDetails('${tradeId}')" class="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600">
                👁️ View
              </button>
              ${tradeStatus === 'Pending' ? `
                <button onclick="approveTrade('${tradeId}')" class="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600">
                  ✓ Approve
                </button>
                <button onclick="rejectTrade('${tradeId}')" class="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600">
                  ✗ Reject
                </button>
              ` : `
                <button onclick="deleteTrade('${tradeId}')" class="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600">
                  🗑️ Delete
                </button>
              `}
            </div>
          </td>
        </tr>
      `;
    } catch (error) {
      console.error('Error rendering trade:', trade, error);
      return `
        <tr class="bg-red-50">
          <td colspan="8" class="border p-3 text-red-600">
            Error rendering trade: ${error.message}
            <pre class="text-xs mt-2 overflow-auto max-h-20">${JSON.stringify(trade, null, 2)}</pre>
          </td>
        </tr>
      `;
    }
  }).join('');
}

// Render reports table
function renderReportsTable() {
  const tbody = document.getElementById("reportsTableBody");

  if (allReports.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-8 text-gray-500">No reports found</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = allReports.map(report => {
    const reportDate = new Date(report.createdAt || report.timestamp).toLocaleDateString();
    const reporterName = report.reporterName || report.reportedBy?.firstName + ' ' + report.reportedBy?.lastName || 'Unknown';
    const productName = report.productName || report.productId?.name || 'Unknown Item';
    const productPrice = report.productPrice || report.productId?.price || 0;

    let statusBadge = '';
    switch (report.status) {
      case 'pending':
        statusBadge = '<span class="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">⏳ Pending</span>';
        break;
      case 'reviewed':
        statusBadge = '<span class="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">👁️ Reviewed</span>';
        break;
      case 'resolved':
        statusBadge = '<span class="px-2 py-1 rounded text-xs bg-green-100 text-green-800">✅ Resolved</span>';
        break;
      case 'dismissed':
        statusBadge = '<span class="px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">❌ Dismissed</span>';
        break;
      default:
        statusBadge = '<span class="px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">Unknown</span>';
    }

    let reasonBadge = '';
    switch (report.reason) {
      case 'overpriced':
        reasonBadge = '<span class="px-2 py-1 rounded text-xs bg-red-100 text-red-800">💰 Overpriced</span>';
        break;
      case 'underpriced':
        reasonBadge = '<span class="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">📉 Underpriced</span>';
        break;
      case 'misleading':
        reasonBadge = '<span class="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">⚠️ Misleading</span>';
        break;
      case 'other':
        reasonBadge = '<span class="px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">❓ Other</span>';
        break;
      default:
        reasonBadge = '<span class="px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">Unknown</span>';
    }

    return `
      <tr class="hover:bg-gray-50">
        <td class="border p-3 text-sm">${reportDate}</td>
        <td class="border p-3">
          <div class="font-semibold text-sm">${productName}</div>
        </td>
        <td class="border p-3 font-semibold">Ksh ${productPrice.toLocaleString()}</td>
        <td class="border p-3">${reasonBadge}</td>
        <td class="border p-3 text-sm">${reporterName}</td>
        <td class="border p-3 text-center">${statusBadge}</td>
        <td class="border p-3">
          <div class="flex gap-1 flex-wrap">
            <button onclick="viewReport('${report._id || report.id}')" class="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600">
              👁️ View
            </button>
            ${report.status === 'pending' ? `
              <button onclick="resolveReport('${report._id || report.id}')" class="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600">
                ✅ Resolve
              </button>
              <button onclick="dismissReport('${report._id || report.id}')" class="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600">
                ❌ Dismiss
              </button>
            ` : `
              <button onclick="deleteReport('${report._id || report.id}')" class="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600">
                🗑️ Delete
              </button>
            `}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Render analytics charts
function renderAnalytics() {
  renderCategoryChart();
  renderTradeTypeChart();
  renderConditionChart();
  renderPriceRangeChart();
}

// Category distribution chart
function renderCategoryChart() {
  const categories = {};
  allItems.forEach(item => {
    const cat = item.category || 'Uncategorized';
    categories[cat] = (categories[cat] || 0) + 1;
  });

  const chartHtml = Object.entries(categories).map(([cat, count]) => {
    const percentage = (count / allItems.length * 100).toFixed(1);
    return `
      <div>
        <div class="flex justify-between mb-1">
          <span class="text-sm font-medium">${cat}</span>
          <span class="text-sm text-gray-600">${count} (${percentage}%)</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
          <div class="bg-blue-600 h-2 rounded-full" style="width: ${percentage}%"></div>
        </div>
      </div>
    `;
  }).join('');

  document.getElementById("categoryChart").innerHTML = chartHtml || '<p class="text-gray-500">No data available</p>';
}

// Trade type distribution chart
function renderTradeTypeChart() {
  const tradeTypes = {};
  allItems.forEach(item => {
    const type = item.tradeType || 'Full Amount';
    tradeTypes[type] = (tradeTypes[type] || 0) + 1;
  });

  const chartHtml = Object.entries(tradeTypes).map(([type, count]) => {
    const percentage = (count / allItems.length * 100).toFixed(1);
    return `
      <div>
        <div class="flex justify-between mb-1">
          <span class="text-sm font-medium">${type}</span>
          <span class="text-sm text-gray-600">${count} (${percentage}%)</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
          <div class="bg-green-600 h-2 rounded-full" style="width: ${percentage}%"></div>
        </div>
      </div>
    `;
  }).join('');

  document.getElementById("tradeTypeChart").innerHTML = chartHtml || '<p class="text-gray-500">No data available</p>';
}

// Condition distribution chart
function renderConditionChart() {
  const conditions = {};
  allItems.forEach(item => {
    const cond = item.condition || 'Unknown';
    conditions[cond] = (conditions[cond] || 0) + 1;
  });

  const chartHtml = Object.entries(conditions).map(([cond, count]) => {
    const percentage = (count / allItems.length * 100).toFixed(1);
    return `
      <div>
        <div class="flex justify-between mb-1">
          <span class="text-sm font-medium">${cond}</span>
          <span class="text-sm text-gray-600">${count} (${percentage}%)</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
          <div class="bg-yellow-600 h-2 rounded-full" style="width: ${percentage}%"></div>
        </div>
      </div>
    `;
  }).join('');

  document.getElementById("conditionChart").innerHTML = chartHtml || '<p class="text-gray-500">No data available</p>';
}

// Price range distribution chart
function renderPriceRangeChart() {
  const ranges = {
    '0-5000': 0,
    '5001-10000': 0,
    '10001-20000': 0,
    '20001-50000': 0,
    '50000+': 0
  };

  allItems.forEach(item => {
    const price = item.price || 0;
    if (price <= 5000) ranges['0-5000']++;
    else if (price <= 10000) ranges['5001-10000']++;
    else if (price <= 20000) ranges['10001-20000']++;
    else if (price <= 50000) ranges['20001-50000']++;
    else ranges['50000+']++;
  });

  const chartHtml = Object.entries(ranges).map(([range, count]) => {
    const percentage = allItems.length > 0 ? (count / allItems.length * 100).toFixed(1) : 0;
    return `
      <div>
        <div class="flex justify-between mb-1">
          <span class="text-sm font-medium">Ksh ${range}</span>
          <span class="text-sm text-gray-600">${count} (${percentage}%)</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
          <div class="bg-purple-600 h-2 rounded-full" style="width: ${percentage}%"></div>
        </div>
      </div>
    `;
  }).join('');

  document.getElementById("priceRangeChart").innerHTML = chartHtml || '<p class="text-gray-500">No data available</p>';
}

// Report management functions
function viewReport(reportId) {
  const report = allReports.find(r => (r._id || r.id) === reportId);
  if (!report) {
    if (window.ModalUtils) {
      window.ModalUtils.showError("Report not found!");
    } else {
      alert("Report not found!");
    }
    return;
  }

  const reportDate = new Date(report.createdAt || report.timestamp).toLocaleString();
  const reporterName = report.reporterName || report.reportedBy?.firstName + ' ' + report.reportedBy?.lastName || 'Unknown';
  const productName = report.productName || report.productId?.name || 'Unknown Item';
  const productPrice = report.productPrice || report.productId?.price || 0;

  let statusText = '';
  switch (report.status) {
    case 'pending':
      statusText = '⏳ Pending Review';
      break;
    case 'reviewed':
      statusText = '👁️ Under Review';
      break;
    case 'resolved':
      statusText = '✅ Resolved';
      break;
    case 'dismissed':
      statusText = '❌ Dismissed';
      break;
    default:
      statusText = 'Unknown';
  }

  let reasonText = '';
  switch (report.reason) {
    case 'overpriced':
      reasonText = '💰 Overpriced - Price too high for this item';
      break;
    case 'underpriced':
      reasonText = '📉 Underpriced - Suspiciously low price';
      break;
    case 'misleading':
      reasonText = '⚠️ Misleading - Description does not match price';
      break;
    case 'other':
      reasonText = '❓ Other pricing concern';
      break;
    default:
      reasonText = 'Unknown';
  }

  let details = `🚩 REPORT DETAILS\n\n`;
  details += `Report ID: ${report._id || report.id}\n`;
  details += `Status: ${statusText}\n`;
  details += `Date: ${reportDate}\n\n`;
  details += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  details += `📦 REPORTED ITEM:\n${productName}\nPrice: Ksh ${productPrice.toLocaleString()}\n\n`;
  details += `❓ REPORT REASON:\n${reasonText}\n\n`;

  if (report.comment) {
    details += `💬 ADDITIONAL DETAILS:\n${report.comment}\n\n`;
  }

  details += `👤 REPORTED BY:\n${reporterName}\n\n`;

  if (report.adminNotes) {
    details += `📝 ADMIN NOTES:\n${report.adminNotes}\n\n`;
  }

  if (report.reviewedBy) {
    details += `👨‍💼 REVIEWED BY:\n${report.reviewedBy.firstName} ${report.reviewedBy.lastName}\n`;
    details += `📅 REVIEWED DATE:\n${new Date(report.reviewedAt).toLocaleString()}\n\n`;
  }

  if (window.ModalUtils) {
    window.ModalUtils.showInfo("Report Details", `<pre style="white-space: pre-wrap; font-family: monospace; text-align: left;">${details}</pre>`);
  } else {
    alert(details);
  }
}

async function resolveReport(reportId) {
  const notes = prompt("Enter resolution notes (optional):");

  try {
    const backendAvailable = await checkBackend();
    if (backendAvailable && typeof window.reportsAPI !== 'undefined') {
      await window.reportsAPI.update(reportId, {
        status: 'resolved',
        adminNotes: notes || 'Resolved by admin'
      });
      if (window.ModalUtils) {
        window.ModalUtils.showSuccess("Report resolved successfully!");
      } else {
        alert("✅ Report resolved successfully!");
      }
    } else {
      // Update locally
      const report = allReports.find(r => (r._id || r.id) === reportId);
      if (report) {
        report.status = 'resolved';
        report.adminNotes = notes || 'Resolved by admin';
        report.reviewedBy = 'Admin';
        report.reviewedAt = new Date().toISOString();
        localStorage.setItem('itemReports', JSON.stringify(allReports));
        if (window.ModalUtils) {
          window.ModalUtils.showSuccess("Report resolved successfully!");
        } else {
          alert("✅ Report resolved successfully!");
        }
      }
    }

    loadDashboardData();
  } catch (error) {
    console.error('Error resolving report:', error);
    if (window.ModalUtils) {
      window.ModalUtils.showError("Failed to resolve report. Please try again.");
    } else {
      alert("Failed to resolve report. Please try again.");
    }
  }
}

async function dismissReport(reportId) {
  const reason = prompt("Enter dismissal reason (optional):");

  try {
    const backendAvailable = await checkBackend();
    if (backendAvailable && typeof window.reportsAPI !== 'undefined') {
      await window.reportsAPI.updateStatus(reportId, {
        status: 'dismissed',
        adminNotes: reason || 'Dismissed by admin'
      });
      if (window.ModalUtils) {
        window.ModalUtils.showSuccess("Report dismissed!");
      } else {
        alert("❌ Report dismissed!");
      }
    } else {
      // Update locally
      const report = allReports.find(r => (r._id || r.id) === reportId);
      if (report) {
        report.status = 'dismissed';
        report.adminNotes = reason || 'Dismissed by admin';
        report.reviewedBy = 'Admin';
        report.reviewedAt = new Date().toISOString();
        localStorage.setItem('itemReports', JSON.stringify(allReports));
        if (window.ModalUtils) {
          window.ModalUtils.showSuccess("Report dismissed!");
        } else {
          alert("❌ Report dismissed!");
        }
      }
    }

    loadDashboardData();
  } catch (error) {
    console.error('Error dismissing report:', error);
    if (window.ModalUtils) {
      window.ModalUtils.showError("Failed to dismiss report. Please try again.");
    } else {
      alert("Failed to dismiss report. Please try again.");
    }
  }
}

async function deleteReport(reportId) {
  if (!confirm("Are you sure you want to delete this report?")) return;

  try {
    const backendAvailable = await checkBackend();
    if (backendAvailable && typeof window.reportsAPI !== 'undefined') {
      await window.reportsAPI.delete(reportId);
      if (window.ModalUtils) {
        window.ModalUtils.showSuccess("Report deleted successfully!");
      } else {
        alert("🗑️ Report deleted successfully!");
      }
    } else {
      // Delete locally
      allReports = allReports.filter(r => (r._id || r.id) !== reportId);
      localStorage.setItem('itemReports', JSON.stringify(allReports));
      if (window.ModalUtils) {
        window.ModalUtils.showSuccess("Report deleted successfully!");
      } else {
        alert("🗑️ Report deleted successfully!");
      }
    }

    loadDashboardData();
  } catch (error) {
    console.error('Error deleting report:', error);
    if (window.ModalUtils) {
      window.ModalUtils.showError("Failed to delete report. Please try again.");
    } else {
      alert("Failed to delete report. Please try again.");
    }
  }
}

// View item details
function viewItem(itemId) {
  const item = allItems.find(i => i.id === itemId);
  if (!item) {
    if (window.ModalUtils) {
      window.ModalUtils.showError("Item not found!");
    } else {
      alert("Item not found!");
    }
    return;
  }

  const itemDetails = `Name: ${item.name}\nPrice: Ksh ${item.price.toLocaleString()}\nCondition: ${item.condition}\nCategory: ${item.category || 'N/A'}\nTrade Type: ${item.tradeType || 'Full Amount'}\nDescription: ${item.description || 'No description'}`;
  
  if (window.ModalUtils) {
    window.ModalUtils.showInfo("Item Details", `<pre style="white-space: pre-wrap; font-family: monospace; text-align: left;">${itemDetails}</pre>`);
  } else {
    alert(`Item Details:\n\n${itemDetails}`);
  }
}

// Delete item
function deleteItem(itemId) {
  itemToDelete = itemId;
  document.getElementById("deleteModal").classList.remove("hidden");
}

// Close delete modal
function closeDeleteModal() {
  document.getElementById("deleteModal").classList.add("hidden");
  itemToDelete = null;
}

// Confirm delete
async function confirmDelete() {
  if (itemToDelete === null) return;

  try {
    const backendAvailable = await checkBackend();
    if (backendAvailable && typeof window.productsAPI !== 'undefined') {
      await window.productsAPI.delete(itemToDelete);
      if (window.ModalUtils) {
        window.ModalUtils.showSuccess("Item deleted successfully!");
      } else {
        alert("Item deleted successfully!");
      }
    } else {
      allItems = allItems.filter(item => item.id !== itemToDelete);
      localStorage.setItem("myItems", JSON.stringify(allItems));
      if (window.ModalUtils) {
        window.ModalUtils.showSuccess("Item deleted successfully!");
      } else {
        alert("Item deleted successfully!");
      }
    }

    loadDashboardData();
    closeDeleteModal();
  } catch (error) {
    console.error('Error deleting item:', error);
    if (window.ModalUtils) {
      window.ModalUtils.showError("Failed to delete item. Please try again.");
    } else {
      alert("Failed to delete item. Please try again.");
    }
    closeDeleteModal();
  }
}

// Clear all items
async function clearAllItems() {
  if (!confirm("Are you sure you want to delete ALL items? This action cannot be undone!")) {
    return;
  }

  try {
    const backendAvailable = await checkBackend();
    if (backendAvailable && typeof window.productsAPI !== 'undefined') {
      // Delete all items from backend
      for (const item of allItems) {
        await window.productsAPI.delete(item.id);
      }
      if (window.ModalUtils) {
        window.ModalUtils.showSuccess("All items have been deleted!");
      } else {
        alert("All items have been deleted!");
      }
    } else {
      localStorage.removeItem("myItems");
      if (window.ModalUtils) {
        window.ModalUtils.showSuccess("All items have been deleted!");
      } else {
        alert("All items have been deleted!");
      }
    }

    allItems = [];
    loadDashboardData();
  } catch (error) {
    console.error('Error clearing items:', error);
    if (window.ModalUtils) {
      window.ModalUtils.showError("Failed to clear all items. Please try again.");
    } else {
      alert("Failed to clear all items. Please try again.");
    }
  }
}

// View trade details
function viewTradeDetails(tradeId) {
  const trade = allTrades.find(t => t.id === tradeId);
  if (!trade) {
    if (window.ModalUtils) {
      window.ModalUtils.showError("Trade not found!");
    } else {
      alert("Trade not found!");
    }
    return;
  }

  const requestedItemName = trade.requestedItem?.name || 'Unknown';
  const requestedPrice = trade.requestedItem?.price || trade.requestingValue || 0;

  let offeredDescription = '';
  let offeredValue = trade.offeringValue || 0;

  if (trade.tradeType === 'BarterOnly' && trade.offeredItem) {
    offeredDescription = `${trade.offeredItem.name}\nValue: Ksh ${trade.offeredItem.price.toLocaleString()}`;
  } else if (trade.tradeType === 'MoneyOnly') {
    offeredDescription = `Cash Payment\nAmount: Ksh ${trade.moneyAmount.toLocaleString()}`;
  } else if (trade.tradeType === 'BarterPlusMoney' && trade.offeredItem) {
    offeredDescription = `${trade.offeredItem.name} + Ksh ${trade.moneyAmount.toLocaleString()}`;
  }

  const valueDiff = trade.valueDifference || (offeredValue - requestedPrice);
  const diffPercentage = requestedPrice > 0 ? Math.abs((valueDiff / requestedPrice) * 100) : 0;
  const fairnessScore = trade.fairnessScore || Math.max(0, 100 - diffPercentage).toFixed(1);

  let details = `📊 TRADE DETAILS\n\n`;
  details += `Trade ID: #${trade.id}\n`;
  details += `Status: ${trade.status}\n`;
  details += `Date: ${new Date(trade.date).toLocaleString()}\n\n`;
  details += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  details += `📦 REQUESTED ITEM:\n${requestedItemName}\nValue: Ksh ${requestedPrice.toLocaleString()}\n\n`;
  details += `💰 OFFERED:\n${offeredDescription}\nTotal Value: Ksh ${offeredValue.toLocaleString()}\n\n`;
  details += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  details += `📈 TRADE ANALYSIS:\n`;
  details += `Value Difference: ${valueDiff >= 0 ? '+' : ''}Ksh ${Math.abs(valueDiff).toLocaleString()}\n`;
  details += `Difference %: ${diffPercentage.toFixed(1)}%\n`;
  details += `Fairness Score: ${fairnessScore}%\n`;
  details += `Trade Type: ${trade.tradeType || 'N/A'}\n\n`;

  if (trade.needsReview || diffPercentage > 30) {
    details += `⚠️ WARNING: Large price difference detected!\n`;
    details += `This trade requires careful review.\n`;
  } else {
    details += `✅ Trade appears fair and balanced.\n`;
  }

  alert(details);
}

// Approve trade
async function approveTrade(tradeId) {
  const trade = allTrades.find(t => t.id === tradeId);
  if (!trade) return;

  // Check if trade needs review
  const requestedPrice = trade.requestedItem?.price || trade.requestingValue || 0;
  const offeredValue = trade.offeringValue || 0;
  const valueDiff = trade.valueDifference || (offeredValue - requestedPrice);
  const diffPercentage = requestedPrice > 0 ? Math.abs((valueDiff / requestedPrice) * 100) : 0;

  if (diffPercentage > 30) {
    const confirm = window.confirm(
      `⚠️ WARNING: This trade has a ${diffPercentage.toFixed(1)}% price difference!\n\n` +
      `Offered: Ksh ${offeredValue.toLocaleString()}\n` +
      `Requested: Ksh ${requestedPrice.toLocaleString()}\n` +
      `Difference: ${valueDiff >= 0 ? '+' : ''}Ksh ${Math.abs(valueDiff).toLocaleString()}\n\n` +
      `Are you sure you want to approve this potentially unfair trade?`
    );

    if (!confirm) {
      return;
    }
  }

  try {
    const backendAvailable = await checkBackend();
    if (backendAvailable && typeof window.tradesAPI !== 'undefined') {
      await window.tradesAPI.updateStatus(tradeId, {
        status: "Approved",
        approvedBy: "Admin",
        approvedDate: new Date().toISOString()
      });
      alert("✅ Trade approved successfully!");
    } else {
      trade.status = "Approved";
      trade.approvedBy = "Admin";
      trade.approvedDate = new Date().toISOString();
      localStorage.setItem("trades", JSON.stringify(allTrades));
      alert("✅ Trade approved successfully!");
    }

    loadDashboardData();
  } catch (error) {
    console.error('Error approving trade:', error);
    if (window.ModalUtils) {
      window.ModalUtils.showError("Failed to approve trade. Please try again.");
    } else {
      alert("Failed to approve trade. Please try again.");
    }
  }
}

// Reject trade
async function rejectTrade(tradeId) {
  const trade = allTrades.find(t => t.id === tradeId);
  if (!trade) return;

  const reason = prompt("Enter rejection reason (optional):");

  try {
    const backendAvailable = await checkBackend();
    if (backendAvailable && typeof window.tradesAPI !== 'undefined') {
      await window.tradesAPI.updateStatus(tradeId, {
        status: "Rejected",
        rejectedBy: "Admin",
        rejectedDate: new Date().toISOString(),
        rejectionReason: reason || "Not specified"
      });
      alert("❌ Trade rejected!");
    } else {
      trade.status = "Rejected";
      trade.rejectedBy = "Admin";
      trade.rejectedDate = new Date().toISOString();
      trade.rejectionReason = reason || "Not specified";
      localStorage.setItem("trades", JSON.stringify(allTrades));
      alert("❌ Trade rejected!");
    }

    loadDashboardData();
  } catch (error) {
    console.error('Error rejecting trade:', error);
    alert("Failed to reject trade. Please try again.");
  }
}

// Delete trade
async function deleteTrade(tradeId) {
  if (!confirm("Delete this trade record?")) return;

  try {
    const backendAvailable = await checkBackend();
    if (backendAvailable && typeof window.tradesAPI !== 'undefined') {
      await window.tradesAPI.delete(tradeId);
      alert("Trade deleted!");
    } else {
      allTrades = allTrades.filter(t => t.id !== tradeId);
      localStorage.setItem("trades", JSON.stringify(allTrades));
      alert("Trade deleted!");
    }

    loadDashboardData();
  } catch (error) {
    console.error('Error deleting trade:', error);
    alert("Failed to delete trade. Please try again.");
  }
}

// Export data
function exportData() {
  const data = {
    items: allItems,
    trades: allTrades,
    reports: allReports,
    exportDate: new Date().toISOString()
  };

  const dataStr = JSON.stringify(data, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `digital-soko-export-${Date.now()}.json`;
  link.click();

  URL.revokeObjectURL(url);
  alert("Data exported successfully!");
}

// Backup data
function backupData() {
  const backup = {
    items: localStorage.getItem("myItems"),
    trades: localStorage.getItem("trades"),
    reports: localStorage.getItem("itemReports"),
    backupDate: new Date().toISOString()
  };

  const backupStr = JSON.stringify(backup, null, 2);
  const backupBlob = new Blob([backupStr], { type: 'application/json' });
  const url = URL.createObjectURL(backupBlob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `digital-soko-backup-${Date.now()}.json`;
  link.click();

  URL.revokeObjectURL(url);
  alert("Backup created successfully!");
}

// Restore data
function restoreData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';

  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const backup = JSON.parse(event.target.result);

        if (backup.items) {
          localStorage.setItem("myItems", backup.items);
        }
        if (backup.trades) {
          localStorage.setItem("trades", backup.trades);
        }
        if (backup.reports) {
          localStorage.setItem("itemReports", backup.reports);
        }

        loadDashboardData();
        alert("Data restored successfully!");
      } catch (error) {
        alert("Error restoring data: Invalid backup file");
      }
    };
    reader.readAsText(file);
  };

  input.click();
}

// Reset platform
function resetPlatform() {
  const confirmation = prompt("Type 'RESET' to confirm platform reset:");

  if (confirmation !== 'RESET') {
    alert("Reset cancelled");
    return;
  }

  localStorage.clear();
  allItems = [];
  allTrades = [];
  allReports = [];
  loadDashboardData();
  alert("Platform has been reset!");
}