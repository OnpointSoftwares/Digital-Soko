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

// Load items from backend or localStorage
async function loadMyItems() {
  const container = document.getElementById("my-items-list");
  container.innerHTML = '<div class="col-span-full text-center py-12"><p class="text-gray-500 text-lg">Loading your items...</p></div>';
  
  let myItems = [];
  
  try {
    // Get current user from localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    
    console.log('User from localStorage:', user);
    console.log('User keys:', Object.keys(user));
    console.log('Is logged in:', isLoggedIn);
    
    // Extract user ID from various possible locations
    const userId = user._id || user.id || user.user?._id || user.user?.id;
    
    console.log('Extracted userId:', userId);
    
    // Check if user is logged in and has valid ID
    if (!userId) {
      // No valid user ID - show login message
      container.innerHTML = `
        <div class="col-span-full text-center py-12">
          <p class="text-gray-500 text-lg mb-4">Please log in to view your items.</p>
          <p class="text-sm text-gray-600 mb-4">User ID not found. Please login again.</p>
          <a href="login.html" class="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Login
          </a>
        </div>
      `;
      return;
    }
    
    // Load from backend database only
    if (!window.productsAPI) {
      container.innerHTML = `
        <div class="col-span-full text-center py-12">
          <p class="text-red-500 text-lg mb-4">API client not available. Please refresh the page.</p>
        </div>
      `;
      return;
    }

    const backendAvailable = await checkBackend();
    if (!backendAvailable) {
      container.innerHTML = `
        <div class="col-span-full text-center py-12">
          <p class="text-red-500 text-lg mb-4">Backend server is not running.</p>
          <p class="text-sm text-gray-600">Please start the backend server: <code class="bg-gray-100 px-2 py-1 rounded">cd Backend && npm run dev</code></p>
        </div>
      `;
      return;
    }

    // Load items by seller ID from database
    console.log('Loading items for user ID:', userId);
    console.log('User object:', user);
    console.log('Auth token:', api.getToken());
    
    const response = await productsAPI.getBySeller(userId);
    console.log('API response:', response);
    console.log('Products returned:', response.data?.products);
    
    myItems = response.data?.products || response.data || [];
    console.log('Loaded items count:', myItems.length);
    
    // Log each item's seller ID to verify
    myItems.forEach(item => {
      console.log(`Item: ${item.name}, Seller ID: ${item.seller?._id || item.seller}, Expected: ${userId}`);
    });
  } catch (error) {
    console.error('Error loading items:', error);
    container.innerHTML = `
      <div class="col-span-full text-center py-12">
        <p class="text-red-500 text-lg mb-4">Error loading items: ${error.message}</p>
        <button onclick="loadMyItems()" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Retry</button>
      </div>
    `;
    return;
  }
  
  container.innerHTML = "";

  if (myItems.length === 0) {
    container.innerHTML = `
      <div class="col-span-full text-center py-12">
        <p class="text-gray-500 text-lg mb-4">You haven't posted any items yet.</p>
        <a href="post-item.html" class="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Post Your First Item
        </a>
      </div>
    `;
    return;
  }

  myItems.forEach(item => {
    const card = document.createElement("div");
    card.className = "bg-white p-4 rounded-lg shadow hover:shadow-lg transition";
    
    // Handle both backend and localStorage formats
    const imageUrl = item.images?.[0]?.url || item.image || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="16" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
    const itemId = item._id || item.id;
    const itemPrice = item.price || 0;
    const itemCondition = item.condition || 'N/A';
    const itemCategory = item.category || 'N/A';
    
    card.innerHTML = `
      <img src="${imageUrl}" 
           alt="${item.name}" 
           class="w-full h-40 object-cover rounded-md mb-3"
           onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Crect fill=%22%23ddd%22 width=%22200%22 height=%22200%22/%3E%3Ctext fill=%22%23999%22 font-family=%22sans-serif%22 font-size=%2216%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22%3ENo Image%3C/text%3E%3C/svg%3E'">
      <h3 class="text-lg font-bold">${item.name}</h3>
      <p class="text-gray-600">Condition: ${itemCondition}</p>
      <p class="text-gray-600">Category: ${itemCategory}</p>
      <p class="text-gray-800 font-semibold">Ksh ${itemPrice.toLocaleString()}</p>
      <div class="mt-4 flex justify-between gap-2">
        <button onclick="editItem('${itemId}')" class="flex-1 px-3 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600">Edit</button>
        <button onclick="deleteItem('${itemId}')" class="flex-1 px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600">Delete</button>
      </div>
    `;
    container.appendChild(card);
  });
}

function editItem(id) {
  // Redirect to post-item page with edit parameter
  window.location.href = "post-item.html?edit=" + id;
}

async function deleteItem(id) {
  if (!confirm("Are you sure you want to delete this item?")) {
    return;
  }
  
  try {
    // Delete from database only
    if (!window.productsAPI) {
      alert("API client not available. Please refresh the page.");
      return;
    }

    const backendAvailable = await checkBackend();
    if (!backendAvailable) {
      alert("Backend server is not running. Please start it first.");
      return;
    }

    await productsAPI.delete(id);
    alert("Item deleted successfully from database!");
    loadMyItems();
  } catch (error) {
    console.error('Error deleting from database:', error);
    alert("Failed to delete item: " + error.message);
  }
}

// Load items on page load
window.onload = loadMyItems;
