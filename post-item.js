// Image preview functionality
const itemImgInput = document.getElementById("itemImg");
const imagePreview = document.createElement("div");
imagePreview.id = "imagePreview";
imagePreview.className = "mt-3 hidden";
imagePreview.innerHTML = `
  <p class="text-sm text-gray-600 mb-2">Image Preview:</p>
  <img id="previewImg" class="w-full max-w-xs h-48 object-cover rounded-lg border-2 border-gray-300" />
  <button type="button" id="removeImage" class="mt-2 text-sm text-red-600 hover:text-red-800">Remove Image</button>
`;
itemImgInput.parentElement.appendChild(imagePreview);

// Handle image selection and preview
itemImgInput.addEventListener("change", function(e) {
  const file = e.target.files[0];
  if (file) {
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image size should be less than 5MB");
      itemImgInput.value = "";
      return;
    }
    
    // Check file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      itemImgInput.value = "";
      return;
    }
    
    const reader = new FileReader();
    reader.onload = function(event) {
      document.getElementById("previewImg").src = event.target.result;
      imagePreview.classList.remove("hidden");
    };
    reader.readAsDataURL(file);
  }
});

// Remove image button
document.addEventListener("click", function(e) {
  if (e.target && e.target.id === "removeImage") {
    itemImgInput.value = "";
    imagePreview.classList.add("hidden");
  }
});

// Check backend availability
async function checkBackend() {
  try {
    const response = await fetch('http://localhost:5000/health');
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Check if editing existing item
const urlParams = new URLSearchParams(window.location.search);
const editItemId = urlParams.get('edit');
let isEditMode = false;
let currentEditItem = null;

// Load item data if editing
if (editItemId) {
  isEditMode = true;
  loadItemForEdit(editItemId);
}

async function loadItemForEdit(itemId) {
  try {
    if (!window.productsAPI) return;
    
    const backendAvailable = await checkBackend();
    if (!backendAvailable) return;
    
    const response = await productsAPI.getById(itemId);
    currentEditItem = response.data;
  
    if (currentEditItem) {
      // Update page title
      const pageTitle = document.querySelector("h1");
      if (pageTitle) {
        pageTitle.textContent = "Edit Item";
      }
      
      // Update button text
      const submitBtn = document.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.textContent = "Update Item";
      }
      
      // Pre-fill form with existing data
      document.getElementById("itemName").value = currentEditItem.name || "";
      document.getElementById("itemDesc").value = currentEditItem.description || "";
      document.getElementById("itemCategory").value = currentEditItem.category || "";
      document.getElementById("itemCondition").value = currentEditItem.condition || "";
      document.getElementById("itemPrice").value = currentEditItem.price || "";
      document.getElementById("itemTradeType").value = currentEditItem.tradeType || "";
      
      // Show existing image if available
      const imageUrl = currentEditItem.images?.[0]?.url || currentEditItem.image;
      if (imageUrl && !imageUrl.includes('data:image/svg+xml')) {
        document.getElementById("previewImg").src = imageUrl;
        imagePreview.classList.remove("hidden");
      }
    }
  } catch (error) {
    console.error('Error loading item for edit:', error);
  }
}

// Handle Post Item Form Submission
document.getElementById("postItemForm").addEventListener("submit", async function(e) {
  e.preventDefault();

  // Get form values
  const itemName = document.getElementById("itemName").value.trim();
  const itemDesc = document.getElementById("itemDesc").value.trim();
  const itemCategory = document.getElementById("itemCategory").value;
  const itemCondition = document.getElementById("itemCondition").value;
  const itemPrice = parseFloat(document.getElementById("itemPrice").value);
  const itemTradeType = document.getElementById("itemTradeType").value;

  // Validation
  if (!itemName || !itemCategory || !itemCondition || !itemPrice || !itemTradeType) {
    alert("Please fill in all required fields!");
    return;
  }

  if (isNaN(itemPrice) || itemPrice <= 0) {
    alert("Please enter a valid price!");
    return;
  }

  // Get current user and token
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token') || user.token;
  const userId = user._id || user.id || user.user?._id || user.user?.id;
  
  console.log('User:', user);
  console.log('Token:', token);
  console.log('User ID:', userId);
  
  if (!userId || !token) {
    alert("Please login to post items. User ID or token missing.");
    window.location.href = 'login.html';
    return;
  }
  
  // Ensure token is set in API client
  if (window.api && token) {
    if (typeof api.setToken === 'function') {
      api.setToken(token);
    }
  }
  // Store it in localStorage for future use
  localStorage.setItem('token', token);

  // Disable submit button
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = isEditMode ? 'Updating...' : 'Posting...';

  try {
    // Get uploaded image file if any
    const imageFile = itemImgInput.files && itemImgInput.files[0] ? itemImgInput.files[0] : null;
    await saveItemToDatabase(itemName, itemDesc, itemCategory, itemCondition, itemPrice, itemTradeType, imageFile);
  } catch (error) {
    console.error('Error saving item:', error);
    alert('Failed to save item: ' + error.message);
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
});

async function saveItemToDatabase(itemName, itemDesc, itemCategory, itemCondition, itemPrice, itemTradeType, imageFile) {
  // Check API availability
  if (!window.productsAPI) {
    throw new Error('API client not available');
  }

  const backendAvailable = await checkBackend();
  if (!backendAvailable) {
    throw new Error('Backend server is not running');
  }

  try {
    if (isEditMode && currentEditItem) {
      // Update existing item
      const productId = currentEditItem._id || currentEditItem.id;
      
      if (imageFile) {
        // Create FormData with image and other fields
        const formData = new FormData();
        formData.append('images', imageFile);
        formData.append('name', itemName);
        formData.append('description', itemDesc);
        formData.append('category', itemCategory);
        formData.append('condition', itemCondition);
        formData.append('price', itemPrice);
        formData.append('tradeType', itemTradeType);
        formData.append('stock', 1);
        
        await productsAPI.updateWithImages(productId, formData);
      } else {
        // Update without image
        const productData = {
          name: itemName,
          description: itemDesc,
          category: itemCategory,
          condition: itemCondition,
          price: itemPrice,
          tradeType: itemTradeType,
          stock: 1
        };
        await productsAPI.update(productId, productData);
      }
      
      showSuccessModal("Item updated successfully!");
    } else {
      // Create new item
      const productData = {
        name: itemName,
        description: itemDesc,
        category: itemCategory,
        condition: itemCondition,
        price: itemPrice,
        tradeType: itemTradeType,
        stock: 1
      };
      
      // Check price and auto-approve
      const approvalResult = await checkPriceAndAutoApprove(productData);
      
      // Add approval status to product data
      productData.approvalStatus = approvalResult.approved ? 'approved' : 'pending';
      if (approvalResult.reason) {
        productData.approvalReason = approvalResult.reason;
      }
      if (approvalResult.analysis) {
        productData.priceAnalysis = approvalResult.analysis;
      }
      
      // Handle image upload
      if (imageFile) {
        const formData = new FormData();
        formData.append('images', imageFile);
        formData.append('name', itemName);
        formData.append('description', itemDesc);
        formData.append('category', itemCategory);
        formData.append('condition', itemCondition);
        formData.append('price', itemPrice);
        formData.append('tradeType', itemTradeType);
        formData.append('stock', 1);
        formData.append('approvalStatus', productData.approvalStatus);
        if (productData.approvalReason) {
          formData.append('approvalReason', productData.approvalReason);
        }
        
        await productsAPI.createWithImages(formData);
      } else {
        await productsAPI.create(productData);
      }
      
      // Show appropriate success message based on approval
      if (approvalResult.approved) {
        showApprovalModal(
          "Item posted and automatically approved!", 
          approvalResult.reason, 
          approvalResult.analysis
        );
      } else {
        showApprovalModal(
          "Item posted for review", 
          approvalResult.reason, 
          approvalResult.analysis
        );
      }
      
      // Reset form
      document.getElementById("postItemForm").reset();
      imagePreview.classList.add("hidden");
    }
  } catch (error) {
    console.error('Error saving product:', error);
    throw error;
  }
}

// Auto-approval system - Only reject overpriced items
async function checkPriceAndAutoApprove(itemData) {
  if (!window.priceChecker) {
    return { 
      approved: true, 
      reason: "Price checker not available - Auto-approved", 
      skipCheck: true 
    };
  }

  try {
    const result = await window.priceChecker.checkAndAutoApprove(
      itemData,
      (reason, analysis) => {
        // Auto-approved callback
        console.log('Item auto-approved:', reason);
      },
      (reason, analysis) => {
        // Auto-rejected callback (overpriced items only)
        console.log('Item auto-rejected (overpriced):', reason);
      }
    );

    // If no result, default to approved
    if (!result) {
      return { 
        approved: true, 
        reason: "No price data available - Auto-approved" 
      };
    }

    // Only reject if explicitly marked as overpriced
    // Check if the analysis indicates overpricing
    const isOverpriced = result.analysis && 
                        (result.analysis.assessment?.toLowerCase().includes('overpriced') ||
                         result.analysis.assessment?.toLowerCase().includes('too high') ||
                         result.analysis.assessment?.toLowerCase().includes('expensive'));
    
    if (isOverpriced && !result.approved) {
      // Item is overpriced - reject it
      return {
        approved: false,
        reason: result.reason || "Price is significantly higher than market value",
        analysis: result.analysis
      };
    }
    
    // All other cases (fairly priced, underpriced, or uncertain) - approve
    return {
      approved: true,
      reason: result.reason || "Price is within acceptable range",
      analysis: result.analysis
    };
    
  } catch (error) {
    console.error('Auto-approval check failed:', error);
    // On error, default to approved (fail open)
    return { 
      approved: true, 
      reason: "Price verification unavailable - Auto-approved", 
      skipCheck: true 
    };
  }
}

// Approval Modal Functions
function showApprovalModal(title, reason, analysis) {
  if (!window.ModalUtils) {
    showSuccessModal(title);
    return;
  }

  // Debug: Log what we're receiving
  console.log('Post-item modal debug - analysis:', analysis);
  console.log('Post-item modal debug - priceSources:', analysis?.priceSources);
  console.log('Post-item modal debug - shops:', analysis?.shops);
  
  // Build sources HTML if available
  let sourcesHtml = '';
  if (analysis && analysis.priceSources && Array.isArray(analysis.priceSources) && analysis.priceSources.length > 0) {
    sourcesHtml = `<div class="mt-1 p-1 bg-blue-50 rounded text-xs">
         <span class="text-blue-700">${analysis.priceSources.slice(0, 2).join(' • ')}</span>
       </div>`;
  }

  // Build analysis HTML if available
  let analysisHtml = '';
  if (analysis && analysis.assessment) {
    const confidence = analysis.confidence || 0;
    analysisHtml = `<div class="mt-1 p-1 bg-gray-50 rounded">
         <p class="text-xs text-gray-700">${analysis.assessment} (${confidence}/10)</p>
       </div>`;
  }

  const content = `
    <div class="text-left">
      ${sourcesHtml}
      ${analysisHtml}
    </div>
  `;

  // Show success modal first
  window.ModalUtils.showSuccess(title, () => {
    // Redirect to My Items page after closing
    window.location.href = "my-items.html";
  });
  
  // Show detailed analysis if available (without blocking redirect)
  if (analysis && (sourcesHtml || analysisHtml)) {
    setTimeout(() => {
      window.ModalUtils.showInfo('Detailed Analysis', content);
    }, 500);
  }
}

// Success Modal Functions
function showSuccessModal(message) {
  if (window.ModalUtils) {
    window.ModalUtils.showSuccess(message, () => {
      // Redirect to My Items page after success
      window.location.href = "my-items.html";
    });
  } else {
    // Fallback to original modal
    const modal = document.getElementById("successModal");
    const messageEl = document.getElementById("successMessage");
    if (modal && messageEl) {
      messageEl.textContent = message;
      modal.classList.remove("hidden");
    }
  }
}

function closeSuccessModal() {
  const modal = document.getElementById("successModal");
  if (modal) {
    modal.classList.add("hidden");
    // Redirect to My Items page
    window.location.href = "my-items.html";
  }
}

// Attach close modal handler if modal exists
document.addEventListener('DOMContentLoaded', function() {
  const closeBtn = document.getElementById("closeSuccessModal");
  if (closeBtn) {
    closeBtn.addEventListener("click", closeSuccessModal);
  }
});

// Mobile Menu Toggle (if needed)
const menuToggle = document.getElementById("menu-toggle");
if (menuToggle) {
  menuToggle.addEventListener("click", () => {
    const mobileMenu = document.getElementById("mobile-menu");
    if (mobileMenu) {
      mobileMenu.classList.toggle("hidden");
    }
  });
}