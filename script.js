const STORAGE_KEY = 'iconoCart';
const TAX_RATE = 0.16;

function getCart() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}

function saveCart(cart) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
}

function formatPrice(value) {
    return '$' + Number(value || 0).toFixed(2);
}

function showToast(message) {
    let toast = document.getElementById('toast-message');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-message';
        toast.className = 'toast-message';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(showToast.timeoutId);
    showToast.timeoutId = window.setTimeout(() => toast.classList.remove('show'), 1800);
}

function updateCartBadge() {
    const badge = document.querySelector('.cart-count');
    if (!badge) return;
    const cart = getCart();
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-flex' : 'none';
}

function addToCart(product) {
    const cart = getCart();
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
        existing.quantity += product.quantity;
    } else {
        cart.push({...product});
    }
    saveCart(cart);
    updateCartBadge();
    showToast(`Agregado al carrito: ${product.name}`);
}

function clearCart() {
    localStorage.removeItem(STORAGE_KEY);
    updateCartBadge();
}

function removeFromCart(id) {
    let cart = getCart();
    cart = cart.filter(item => item.id !== id);
    saveCart(cart);
    renderCartPage();
    updateCartBadge();
    showToast('Producto eliminado del carrito');
}

function updateQuantity(id, quantity) {
    const cart = getCart();
    const item = cart.find(entry => entry.id === id);
    if (!item) return;
    item.quantity = quantity < 1 ? 1 : quantity;
    saveCart(cart);
    renderCartPage();
    updateCartBadge();
}

function buildProductFromCard(card, fallbackId) {
    const nameElement = card.querySelector('h4, h1');
    const priceElement = card.querySelector('p');
    const imageElement = card.querySelector('img');
    const name = nameElement ? nameElement.innerText.trim() : 'Producto';
    const price = priceElement ? parseFloat(priceElement.innerText.replace('$', '').trim()) || 0 : 0;
    const image = imageElement ? imageElement.src : 'images/product-1.jpg';
    return {
        id: fallbackId,
        name,
        price,
        image,
        quantity: 1
    };
}

function setupProductButtons() {
    document.querySelectorAll('.col-4').forEach((card, index) => {
        if (!card.querySelector('.add-cart-btn')) {
            const button = document.createElement('button');
            button.className = 'btn add-cart-btn';
            button.style.marginTop = '12px';
            button.innerText = 'Agregar al carrito';
            card.appendChild(button);
        }
    });

    document.querySelectorAll('.add-cart-btn, .add-to-cart-btn').forEach((button, index) => {
        const card = button.closest('.col-4') || button.closest('.single-product');
        if (!card) return;
        const product = buildProductFromCard(card, `product-${index + 1}`);
        button.addEventListener('click', () => addToCart(product));
    });
}

function renderCartPage() {
    const itemsBody = document.getElementById('cart-items');
    if (!itemsBody) return;

    const cart = getCart();
    const empty = document.getElementById('cart-empty');
    const table = document.getElementById('cart-table');
    const actions = document.getElementById('cart-actions');
    const checkoutButton = document.getElementById('checkout-button');

    if (!cart.length) {
        empty.style.display = 'block';
        table.style.display = 'none';
        actions.style.display = 'none';
        if (checkoutButton) checkoutButton.style.display = 'none';
        return;
    }

    empty.style.display = 'none';
    table.style.display = 'table';
    actions.style.display = 'flex';
    if (checkoutButton) checkoutButton.style.display = 'inline-flex';
    itemsBody.innerHTML = '';

    let subtotal = 0;

    cart.forEach(item => {
        const row = document.createElement('tr');
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        row.innerHTML = `
            <td>
                <div class="cart-info">
                    <img src="${item.image}" alt="${item.name}">
                    <div>
                        <p>${item.name}</p>
                        <small>Precio: ${formatPrice(item.price)}</small><br>
                        <a href="#" class="remove-item" data-id="${item.id}">Eliminar</a>
                    </div>
                </div>
            </td>
            <td><input type="number" min="1" value="${item.quantity}" data-id="${item.id}" class="cart-qty"></td>
            <td>${formatPrice(itemTotal)}</td>
        `;
        itemsBody.appendChild(row);
    });

    const taxes = subtotal * TAX_RATE;
    document.getElementById('cart-subtotal').textContent = formatPrice(subtotal);
    document.getElementById('cart-taxes').textContent = formatPrice(taxes);
    document.getElementById('cart-total').textContent = formatPrice(subtotal + taxes);

    itemsBody.querySelectorAll('.remove-item').forEach(link => {
        link.addEventListener('click', event => {
            event.preventDefault();
            removeFromCart(event.target.dataset.id);
        });
    });

    itemsBody.querySelectorAll('.cart-qty').forEach(input => {
        input.addEventListener('change', event => {
            const id = event.target.dataset.id;
            const quantity = parseInt(event.target.value, 10) || 1;
            updateQuantity(id, quantity);
        });
    });
}

function renderCheckoutPage() {
    const checkoutItems = document.getElementById('checkout-items');
    if (!checkoutItems) return;

    const cart = getCart();
    const empty = document.getElementById('checkout-empty');
    const summaryTotal = document.getElementById('checkout-total');
    const shipping = document.getElementById('checkout-shipping');
    const taxesField = document.getElementById('checkout-taxes');
    const subtotalField = document.getElementById('checkout-subtotal');
    const payButton = document.getElementById('pay-now');

    if (!cart.length) {
        empty.style.display = 'block';
        checkoutItems.innerHTML = '';
        if (payButton) payButton.disabled = true;
        if (shipping) shipping.textContent = formatPrice(0);
        if (taxesField) taxesField.textContent = formatPrice(0);
        if (subtotalField) subtotalField.textContent = formatPrice(0);
        if (summaryTotal) summaryTotal.textContent = formatPrice(0);
        return;
    }

    empty.style.display = 'none';
    checkoutItems.innerHTML = '';

    let subtotal = 0;
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        const row = document.createElement('div');
        row.className = 'checkout-item';
        row.innerHTML = `
            <div class="checkout-item-image"><img src="${item.image}" alt="${item.name}"></div>
            <div class="checkout-item-details">
                <p>${item.name}</p>
                <small>${item.quantity} x ${formatPrice(item.price)}</small>
            </div>
            <div class="checkout-item-price">${formatPrice(itemTotal)}</div>
        `;
        checkoutItems.appendChild(row);
    });

    const taxes = subtotal * TAX_RATE;
    const shippingCost = 7.00;

    if (subtotalField) subtotalField.textContent = formatPrice(subtotal);
    if (taxesField) taxesField.textContent = formatPrice(taxes);
    if (shipping) shipping.textContent = formatPrice(shippingCost);
    if (summaryTotal) summaryTotal.textContent = formatPrice(subtotal + taxes + shippingCost);
    if (payButton) payButton.disabled = false;
}

function processCheckout(event) {
    event.preventDefault();
    const cart = getCart();
    if (!cart.length) {
        showToast('Tu carrito está vacío. Agrega productos antes de pagar.');
        renderCheckoutPage();
        return;
    }

    const form = document.getElementById('checkout-form');
    const email = form.elements['email'].value.trim();
    const name = form.elements['name'].value.trim();
    const address = form.elements['address'].value.trim();
    const cardNumber = form.elements['card-number'].value.replace(/\s+/g, '');
    const expiry = form.elements['expiry'].value.trim();
    const cvv = form.elements['cvv'].value.trim();

    if (!name || !email || !address || !cardNumber || !expiry || !cvv) {
        showToast('Por favor completa todos los campos de pago.');
        return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        showToast('Ingresa un correo electrónico válido.');
        return;
    }
    if (!/^\d{16}$/.test(cardNumber)) {
        showToast('Ingresa un número de tarjeta válido de 16 dígitos.');
        return;
    }
    if (!/^\d{2}\/\d{2}$/.test(expiry)) {
        showToast('Ingresa una fecha de expiración válida MM/AA.');
        return;
    }
    if (!/^\d{3,4}$/.test(cvv)) {
        showToast('Ingresa un CVV válido.');
        return;
    }

    const orderNumber = Math.floor(Math.random() * 900000) + 100000;
    const total = document.getElementById('checkout-total').textContent;

    clearCart();
    renderCheckoutPage();
    const confirmation = document.getElementById('checkout-confirmation');
    if (confirmation) {
        confirmation.innerHTML = `
            <div class="checkout-confirmation-card">
                <h2>Pago exitoso</h2>
                <p>Gracias, ${name}. Tu orden <strong>#${orderNumber}</strong> ha sido procesada.</p>
                <p>Monto cobrado: <strong>${total}</strong></p>
                <p>Te enviamos un correo de confirmación a <strong>${email}</strong>.</p>
                <a href="products.html" class="btn btn-secondary">Seguir comprando</a>
            </div>
        `;
        confirmation.scrollIntoView({behavior:'smooth'});
    }
    updateCartBadge();
}

function setupMobileMenu() {
    const menu = document.getElementById('MenuItems');
    if (!menu) return;
    menu.style.maxHeight = '0px';
    window.menutoggle = function () {
        if (menu.style.maxHeight === '0px' || menu.style.maxHeight === '') {
            menu.style.maxHeight = '240px';
        } else {
            menu.style.maxHeight = '0px';
        }
    };
}

function setupCheckoutForm() {
    const form = document.getElementById('checkout-form');
    if (!form) return;
    form.addEventListener('submit', processCheckout);
}

function setupPage() {
    updateCartBadge();
    setupMobileMenu();
    renderCartPage();
    renderCheckoutPage();
    setupProductButtons();
    setupCheckoutForm();

    const clearButton = document.getElementById('clear-cart');
    if (clearButton) {
        clearButton.addEventListener('click', () => {
            clearCart();
            renderCartPage();
            showToast('Tu carrito se ha vaciado.');
        });
    }
}

document.addEventListener('DOMContentLoaded', setupPage);
