// --- COOKIE STORAGE UTILITY ---
// This object reads, writes, and deletes data in the browser's cookies.
const CookieStorage = {
    // Saves data to cookies for a set number of days (defaults to 7)
    set(name, value, days = 7) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        const expires = `; expires=${date.toUTCString()}`;
        // Converts JavaScript data to a text string to store it safely
        document.cookie = `${name}=${encodeURIComponent(JSON.stringify(value))}${expires}; path=/; SameSite=Strict`;
    },

    // Retrieves data from cookies and converts it back to JavaScript format
    get(name) {
        const nameEQ = `${name}=`;
        const segments = document.cookie.split(';');
        for (let i = 0; i < segments.length; i++) {
            let item = segments[i].trim();
            if (item.indexOf(nameEQ) === 0) {
                try {
                    return JSON.parse(decodeURIComponent(item.substring(nameEQ.length, item.length)));
                } catch (e) {
                    console.error("Cookie processing read fault:", e);
                    return null;
                }
            }
        }
        return null; // Returns null if the cookie doesn't exist
    },

    // Deletes the cookie by making it expire immediately
    remove(name) {
        document.cookie = `${name}=; max-age=-99999999; path=/; SameSite=Strict`;
    }
};

// --- APPLICATION STATE MANAGEMENT ---
// This object manages the actual calorie data while the app is running.
const AppState = {
    items: [], // Holds the current list of food items

    // Loads previously saved items from the browser cookies
    loadFromCookies() {
        const storedData = CookieStorage.get('app_calorie_items');
        this.items = storedData || [];
    },

    // Saves the current food list to cookies
    saveToCookies() {
        CookieStorage.set('app_calorie_items', this.items);
    },
    
    // Creates a new food item and adds it to our list
    addItem(name, calories) {
        const item = {
            id: crypto.randomUUID(), // Generates a unique ID for each item
            name,
            calories: parseInt(calories, 10) // Ensures calories are treated as numbers
        };
        this.items.push(item);
        this.saveToCookies();
        return item;
    },

    // Removes an item from the data array using its unique ID
    removeItem(id) {
        this.items = this.items.filter(item => item.id !== id);
        this.saveToCookies();
    },

    // Empties the entire food list and clears the browser cookies
    clearAllItems() {
        this.items = [];
        CookieStorage.remove('app_calorie_items');
    },

    // Adds up all the calories in our list to get the grand total
    getTotalCalories() {

        console.log(this.items);

        return this.items.reduce((sum, item) => sum + item.calories, 0);
    }
};
// --- DOM ELEMENT REGISTRY ---
// Grabs and stores all the HTML elements we need to interact with.
const DOM = {
    form: document.getElementById('calorie-form'),
    itemName: document.getElementById('item-name'),
    itemCalories: document.getElementById('item-calories'),
    itemList: document.getElementById('item-list'),
    totalCaloriesDisplay: document.getElementById('total-calories'),
    resetBtn: document.getElementById('btn-reset'),
    suggestBtn: document.getElementById('btn-suggest')
};

// --- USER INTERFACE (UI) ACTIONS ---
// This object handles everything visible on the screen.
const UI = {
    // Updates the total calorie text displayed on the screen
    updateTotalCalories() {
        DOM.totalCaloriesDisplay.textContent = AppState.getTotalCalories();
    },

    // Creates and inserts a new HTML list item into the screen layout
    renderItem(item) {
        const li = document.createElement('li');
        li.className = 'flex justify-between items-center bg-slate-50 border border-slate-100 rounded-lg p-2.5 transition-all hover:bg-slate-100/50';
        li.setAttribute('data-id', item.id);
        
        li.innerHTML = `
            <div class="flex flex-col">
                <span class="font-medium text-slate-700 text-sm">${item.name}</span>
                <span class="text-xs text-indigo-500 font-bold">${item.calories} kcal</span>
            </div>
            <button class="btn-delete text-[11px] bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 px-2 py-1 rounded-md transition-all cursor-pointer">
                Remove
            </button>
        `;
        
        DOM.itemList.appendChild(li);
    },

    // Clears the list on the screen and rebuilds it using current data
    renderAllListItems() {
        DOM.itemList.innerHTML = ''; 
        AppState.items.forEach(item => this.renderItem(item));
    },

    // Resets the input form and places the typing cursor back in the food name box
    clearInputs() {
        DOM.form.reset();
        DOM.itemName.focus();
    }
};

// --- EXTERNAL DATA API ---
// Simulates checking an online database to estimate a food's calories
const fetchCalorieData = async (foodName) => {
    if (!foodName) return null;

    try {
        // Simulates a web request to a mock server online
        const response = await fetch(`https://typicode.com`);
        if (!response.ok) throw new Error('Network pipeline transmission error');
        
        await response.json();

        // Local backup library of food items
        const mockDatabase = {
            apple: 95, banana: 105, chicken: 239, 
            rice: 130, egg: 78, avocado: 160, coffee: 5
        };

        const key = foodName.toLowerCase().trim();
        // Returns the calorie count if found, otherwise generates a random number between 50 and 300
        return mockDatabase[key] || Math.floor(Math.random() * (300 - 50 + 1)) + 50;
    } catch (error) {
        // Fallback random number generator if the internet request fails completely
        console.error("Fetch lookup failed, utilizing fallback baseline profile metrics", error);
        return Math.floor(Math.random() * (180 - 60 + 1)) + 60;
    }
};

// --- EVENT LISTENERS ---

// Runs automatically as soon as the webpage finishes loading
document.addEventListener('DOMContentLoaded', () => {
    AppState.loadFromCookies(); // Load saved data
    UI.renderAllListItems();    // Display saved data
    UI.updateTotalCalories();   // Show total calories
});

// Listens for when the user clicks "Submit" to add their custom entry
DOM.form.addEventListener('submit', (e) => {
    e.preventDefault(); // Prevents the webpage from reloading on form submit

    console.log("Form submitted")

    const name = DOM.itemName.value.trim();
    const calories = DOM.itemCalories.value;

    if (!name || !calories) return; // Stop if either field is left empty

    const newItem = AppState.addItem(name, calories);

    console.log(newItem);
    
    UI.renderItem(newItem);
    UI.updateTotalCalories();
    UI.clearInputs();
});

// Listens for clicks on the "Fetch Cal" button to auto-fill calorie data
DOM.suggestBtn.addEventListener('click', async () => {
    const rawInput = DOM.itemName.value.trim();
    if (!rawInput) {
        alert('Please specify a description string text inside the input field first.');
        return;
    }

    // Change button text and disable it to prevent multiple rapid clicks
    DOM.suggestBtn.textContent = '...';
    DOM.suggestBtn.disabled = true;

    // Wait for the simulated web request to finish and get the number
    DOM.itemCalories.value = await fetchCalorieData(rawInput);

    // Restore the button back to its normal state
    DOM.suggestBtn.textContent = ' Fetch Cal';
    DOM.suggestBtn.disabled = false;
});

// Listens for clicks on the "Remove" buttons using Event Delegation
DOM.itemList.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-delete')) {
        const listItem = e.target.closest('li');
        const itemId = listItem.getAttribute('data-id');

        AppState.removeItem(itemId); // Remove from background data
        listItem.remove();            // Remove from screen layout
        UI.updateTotalCalories();    // Recalculate total calories
    }
});

// Listens for clicks on the complete "Reset" button to wipe all data
DOM.resetBtn.addEventListener('click', () => {
    if (confirm('Clear daily consumption records and wipe browser cookie profiles?')) {
        AppState.clearAllItems();
        UI.renderAllListItems();
        UI.updateTotalCalories();
    }
});