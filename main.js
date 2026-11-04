const CART_STORAGE_KEY = "catalogue-cart-v2";

let products = [];

const cartLink = document.querySelector("#cart-link");
const grid = document.querySelector(".product-grid");
const template = document.querySelector("#product-card-template");
const feedback = document.querySelector("#cart-feedback");
const orderItems = document.querySelector("#order-items");
const orderEmpty = document.querySelector("#order-empty");
const orderTemplate = document.querySelector("#order-item-template");
const orderHeading = document.querySelector("#order-heading");
const orderForm = document.querySelector("#order-form");

function loadCart() {
	try {
		const storedCart = localStorage.getItem(CART_STORAGE_KEY);
		if (storedCart === null) {
			return [];
		}

		const parsedCart = JSON.parse(storedCart);
		if (!Array.isArray(parsedCart)) {
			return [];
		}

		return parsedCart.filter((item) => {
			return item !== null &&
				typeof item === "object" &&
				typeof item.productId === "string" &&
				typeof item.formatId === "string" &&
				Number.isSafeInteger(item.quantity) &&
				item.quantity > 0;
		});
	} catch (error) {
		console.warn("Não foi possível recuperar o carrinho.", error);
		return [];
	}
}

const cart = loadCart();

function saveCart() {
	try {
		localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
		return true;
	} catch (error) {
		console.warn("Não foi possível guardar o carrinho.", error);
		return false;
	}
}

function addToCart(productId, formatId, quantity) {
	const existingItem = cart.find((item) => {
		return item.productId === productId && item.formatId === formatId;
	});
	const total = existingItem ? existingItem.quantity + quantity : quantity;

	if (!Number.isSafeInteger(total) || total < 1) {
		return null;
	}

	if (existingItem) {
		existingItem.quantity = total;
		return total;
	}

	cart.push({
		productId: productId,
		formatId: formatId,
		quantity: quantity
	});

	return quantity;
}

function removeUnknownCartItems() {
	for (let index = cart.length - 1; index >= 0; index--) {
		const item = cart[index];
		const product = products.find((entry) => entry.id === item.productId);

		if (!product || !product.formats.some((format) => format.id === item.formatId)) {
			cart.splice(index, 1);
		}
	}
}

function describeOrderItem(product, format, quantity) {
	const packaging = quantity === 1 ? "embalagem" : "embalagens";

	return `${quantity} ${packaging} × ${format.label} — ${product.name} (${product.category})`;
}

function renderOrder() {
	if (cartLink) {
		cartLink.textContent = `Pedido (${cart.length})`;
	}

	if (!orderItems || !orderEmpty || !orderTemplate) {
		return;
	}

	orderItems.replaceChildren();

	cart.forEach((item, index) => {
		const product = products.find((entry) => {
			return entry.id === item.productId;
		});
		if (!product) {
			return;
		}

		const format = product.formats.find((entry) => {
			return entry.id === item.formatId;
		});
		if (!format) {
			return;
		}

		const row = orderTemplate.content
			.querySelector(".order-item")
			.cloneNode(true);

		const image = row.querySelector(".order-image");
		image.src = format.image;
		image.alt = format.imageAlt;

		row.querySelector(".order-category").textContent = product.category;
		row.querySelector(".order-name").textContent = product.name;
		row.querySelector(".order-packaging").textContent =
			`Embalagem: ${format.label}`;

		const quantityInput = row.querySelector(".order-quantity");
		const quantityLabel = row.querySelector(".order-quantity-label");
		const decrease = row.querySelector(".order-decrease");
		const increase = row.querySelector(".order-increase");

		quantityInput.id = `pedido-${item.formatId}`;
		quantityInput.value = item.quantity;

		quantityLabel.htmlFor = quantityInput.id;

		quantityInput.setAttribute(
			"aria-label",
			`Embalagem de ${product.name}, ${product.category}, ${format.label}`
		);

		decrease.disabled = item.quantity === 1;

		function updateOrderQuantity() {
			const quantity = quantityInput.valueAsNumber;

			if (!quantityInput.reportValidity() ||
				!Number.isSafeInteger(quantity)) {
				quantityInput.value = item.quantity;
				feedback.textContent =
					"Introduza uma quantidade inteira igual ou superior a 1.";
				return;
			}

			item.quantity = quantity;
			decrease.disabled = quantity === 1;

			const saved = saveCart();

			if (saved) {
				feedback.textContent =
					"Quantidade atualizada.";
			} else {
				feedback.textContent =
					"Quantidade atualizada. Não foi possível guardar a alteração neste navegador.";
			}
		}

		decrease.addEventListener("click", () => {
			quantityInput.stepDown();
			updateOrderQuantity();
		});

		increase.addEventListener("click", () => {
			quantityInput.stepUp();
			updateOrderQuantity();
		});

		quantityInput.addEventListener("change", updateOrderQuantity);

		const removeButton = row.querySelector(".order-remove");
		removeButton.setAttribute(
			"aria-label",
			`Remover ${product.name}, ${product.category}, ${format.label}`
		);
		removeButton.addEventListener("click", () => {
			cart.splice(index, 1);

			const saved = saveCart();
			renderOrder();

			feedback.textContent =
				`${product.name} - ${format.label}: removido do pedido.`;

			if (!saved) {
				feedback.textContent = " Não foi possivel guardar alteração neste navegador.";
			}

			const remainingButtons = orderItems.querySelectorAll(".order-remove");
			const nextButton = remainingButtons[index] || remainingButtons[index - 1];
			if (nextButton) {
				nextButton.focus();
			} else if (orderHeading) {
				orderHeading.focus();
			}
		});

		orderItems.append(row);
	});

	orderEmpty.hidden = orderItems.children.length > 0;
	if (orderForm) {
		orderForm.hidden = orderItems.children.length === 0;
	}
}


function normaliseText(text) {
	return text
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
}

function renderProducts() {
	products.forEach((product) => {
		const card = template.content.querySelector(".product-card").cloneNode(true);
		card.dataset.category = product.category;
		card.dataset.searchText = normaliseText(`${product.name} ${product.category}`);

		let selectedFormat = product.formats[0];

		const image = card.querySelector("img");
		const options = card.querySelector(".format-options");
		const input = card.querySelector('input[type="number"]');
		const quantityLabel = card.querySelector(".quantity-control label");
		const decrease = card.querySelector(".quantity-decrease");
		const increase = card.querySelector(".quantity-increase");
		const addButton = card.querySelector(".add-to-cart");
		const cardFeedback = card.querySelector(".product-feedback");

		card.querySelector(".product-category").textContent = product.category;
		card.querySelector("h3").textContent = product.name;

		input.id = `quantidade-${product.id}`;
		quantityLabel.htmlFor = input.id;
		quantityLabel.textContent = "Quantidade a adicionar";
		decrease.setAttribute("aria-label", `Diminuir quantidade de ${product.name}`);
		increase.setAttribute("aria-label", `Aumentar quantidade de ${product.name}`);

		input.addEventListener("change", updateQuantity);

		function updateFormat() {
			image.src = selectedFormat.image;
			image.alt = selectedFormat.imageAlt;
			addButton.setAttribute("aria-label", `Adicionar ${product.name}, ${selectedFormat.label}, ao pedido`);
			cardFeedback.textContent = "";
			input.value = 1;
			decrease.disabled = true;
		}

		const hasChoices = product.formats.length > 1;

		product.formats.forEach((format) => {
			const option = document.createElement(hasChoices ? "label" : "div");
			option.className = "format-option";

			if (hasChoices) {
				const radio = document.createElement("input");
				radio.type = "radio";
				radio.name = `formato-${product.id}`;
				radio.value = format.id;
				radio.checked = format.id === selectedFormat.id;
				radio.addEventListener("change", () => {
					selectedFormat = format;
					updateFormat();
				});
				option.append(radio);
			}

			const text = document.createElement("span");
			text.textContent = format.label;

			option.append(text);
			options.append(option);
		});

		function updateQuantity() {
			if (!input.reportValidity()) {
				return;
			}
			decrease.disabled = input.valueAsNumber === 1;
		}

		decrease.addEventListener("click", () => {
			input.stepDown();
			updateQuantity();
		});

		increase.addEventListener("click", () => {
			input.stepUp();
			updateQuantity();
		});

		addButton.addEventListener("click", () => {
			if (!input.reportValidity()) {
				return;
			}

			const quantity = input.valueAsNumber;
			const total = addToCart(product.id, selectedFormat.id, quantity);

			if (total === null) {
				cardFeedback.textContent = "Introduza uma quantidade inteira válida.";
				return;
			}

			const saved = saveCart();

			renderOrder();

			cardFeedback.textContent =
				`No pedido: ${describeOrderItem(product, selectedFormat, total)}.`;

			if (!saved) {
				cardFeedback.textContent +=
					" Não foi possível guardar o pedido para a próxima visita.";
			}

			input.value = 1;
			updateQuantity();
		});

		addButton.disabled = false;

		updateFormat();
		grid.append(card);
	});
}

function setupFilters() {
	const search = document.querySelector("#product-search");
	const buttons = document.querySelectorAll("#category-filters button");
	const results = document.querySelector("#catalogue-results");
	const cards = grid.querySelectorAll(".product-card");

	let activeCategory = "";

	function applyFilters() {
		const term = normaliseText(search.value.trim());
		const counts = { "": 0 };

		let visibleCount = 0;

		cards.forEach((card) => {
			const category = card.dataset.category;
			const matchesSearch = card.dataset.searchText.includes(term);

			if (matchesSearch) {
				counts[""]++;
				counts[category] = (counts[category] || 0) + 1;
			}

			const matchesCategory = activeCategory === "" || category === activeCategory;
			const visible = matchesSearch && matchesCategory;

			card.hidden = !visible;
			if (visible) {
				visibleCount++;
			}
		});

		buttons.forEach((button) => {
			const category = button.dataset.category;
			const label = category || "Todos";
			const count = counts[category] || 0;

			button.textContent = `${label} (${count})`;
			button.setAttribute(
				"aria-pressed",
				String(category === activeCategory)
			);
		});

		if (visibleCount == 0) {
			results.textContent =
				`Nenhum produto encontrado. Experimente outra pesquisa ou categoria.`;
		} else {
			results.textContent =
				`A mostrar ${visibleCount} de ${cards.length} produtos.`;
		}
	}

	search.addEventListener("input", applyFilters);

	buttons.forEach((button) => {
		button.addEventListener("click", () => {
			activeCategory = button.dataset.category;
			applyFilters();
		});
	});

	applyFilters();
}

function setupRememberDetails() {
	if (!orderForm) {
		return;
	}

	const storageKey = "catalogue-customer";
	const nameInput = orderForm.querySelector("#customer-name");
	const localityInput = orderForm.querySelector("#customer-locality");
	const remember = orderForm.querySelector("#remember-details");

	try {
		const saved = JSON.parse(localStorage.getItem(storageKey));

		if (saved &&
			typeof saved.name === "string" &&
			typeof saved.locality === "string") {
			nameInput.value = saved.name;
			localityInput.value = saved.locality;
			remember.checked = true;
		}
	} catch (error) {
		console.warn("Não foi possível recuperar os dados guardados.", error);
	}

	function updateSavedDetails() {
		try {
			if (!remember.checked) {
				localStorage.removeItem(storageKey);
				return;
			}

			const details = {
				name: nameInput.value.trim(),
				locality: localityInput.value.trim()
			};

			localStorage.setItem(
				storageKey,
				JSON.stringify(details)
			);
		} catch (error) {
			feedback.textContent =
				"Não foi possível atualizar os dados guardados neste navegador.";
			console.warn(error);
		}
	}

	remember.addEventListener("change", updateSavedDetails);

	[nameInput, localityInput].forEach((input) => {
		input.addEventListener("change", () => {
			if (remember.checked) {
				updateSavedDetails();
			}
		});
	});

	orderForm.addEventListener("submit", updateSavedDetails);
}

async function loadProducts() {
	feedback.textContent = "A carregar o catálogo…";

	try {
		const response = await fetch("./products.json");
		if (!response.ok) {
			throw new Error(`Não foi possível carregar o catálogo: ${response.status}`);
		}

		products = await response.json();

		if (!Array.isArray(products)) {
			throw new Error("O catálogo deve conter uma lista de produtos.");
		}

		removeUnknownCartItems();

		if (grid && template) {
			renderProducts();
			setupFilters();
		}

		renderOrder();
		feedback.textContent = "";
		setupRememberDetails();
	} catch (error) {
		feedback.textContent =
			"Não foi possível carregar o catálogo. Atualize a página para tentar novamente.";
		console.error("Erro ao carregar os produtos:", error);
	}
}

loadProducts();

window.addEventListener("pageshow", (event) => {
	// Only sync pages restored from the browser page cache.
	if (!event.persisted || products.length === 0) {
		return;
	}

	const savedCart = loadCart();

	// Replace the in-memory contents with the latest saved order.
	cart.splice(0, cart.length);
	savedCart.forEach((item) => cart.push(item));

	removeUnknownCartItems();
	renderOrder();
});
