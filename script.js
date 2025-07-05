// --- SECURE CONSTANTS (Keep these IN YOUR LOCAL DEV ENVIRONMENT, NOT PUBLISHED!) ---
const CORRECT_PASSWORD = "admin"; // Default password
const CORRECT_ACCESS_KEY = "12345";  // Default secret key

// --- Page Element References ---
const loginSection = document.getElementById('login-section');
const loginForm = document.getElementById('login-form');
const adminContent = document.getElementById('admin-content');
const registerForm = document.getElementById('register-form');
const transactionForm = document.getElementById('transaction-form'); 
const credentialsForm = document.getElementById('credentials-form');
const exportButton = document.getElementById('export-button');
const importFile = document.getElementById('import-file');

const searchForm = document.getElementById('search-form');
const searchPlotIdInput = document.getElementById('search-plot-id'); 
const searchOwnerNameInput = document.getElementById('search-owner-name'); 
const searchGpsCoordsInput = document.getElementById('search-gps-coords'); 
const searchResultsList = document.getElementById('search-results-list'); 
const resultsContainer = document.getElementById('results-container'); 

// --- LOCAL STORAGE KEYS ---
const CREDENTIALS_STORAGE_KEY = 'meretchainAdminCredentials';
const LEDGER_STORAGE_KEY = 'landPlotsDB';

function loadCredentials() {
    const savedCreds = localStorage.getItem(CREDENTIALS_STORAGE_KEY);
    if (savedCreds) return JSON.parse(savedCreds);
    return { password: CORRECT_PASSWORD, accessKey: CORRECT_ACCESS_KEY };
}

function saveCredentials(password, accessKey) {
    localStorage.setItem(CREDENTIALS_STORAGE_KEY, JSON.stringify({ password, accessKey }));
}

function loadLedger() {
    return JSON.parse(localStorage.getItem(LEDGER_STORAGE_KEY)) || {};
}

function saveLedger(data) {
    localStorage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(data));
}

let adminCredentials = loadCredentials();

if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const passwordInput = document.getElementById('password').value;
    const accessKeyInput = document.getElementById('access-key').value;
    if (passwordInput === adminCredentials.password && accessKeyInput === adminCredentials.accessKey) {
      loginSection.style.display = 'none';
      adminContent.style.display = 'block';
    } else {
      alert("Authentication Failed. Incorrect Password or Access Key.");
    }
  });
}

if (registerForm) {
  registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const plotId = document.getElementById('plot-id').value.toUpperCase().trim();
    const ownerName = document.getElementById('owner-name').value.trim();
    const gps = document.getElementById('gps-coords').value.trim();
    // NEW: Capture relational location data
    const northOf = document.getElementById('north-of').value.trim();
    const southOf = document.getElementById('south-of').value.trim();
    const eastOf = document.getElementById('east-of').value.trim();
    const westOf = document.getElementById('west-of').value.trim();

    if (!plotId || !ownerName || !gps) {
      alert("Plot ID, Owner Name, and GPS Coordinates are required.");
      return;
    }

    let landPlotsDB = loadLedger();
    if (landPlotsDB[plotId]) { 
      alert(`Error: Plot ID "${plotId}" already exists. Please use a unique ID.`);
      return;
    }

    const registrationDate = new Date().toLocaleString();
    const genesisTransaction = { type: "INITIAL REGISTRATION", transferredTo: ownerName, date: registrationDate, verifiedBy: "National Land Authority" };
    
    landPlotsDB[plotId] = {
      plotId: plotId, 
      currentOwnerName: ownerName, 
      gpsCoordinates: gps, 
      // NEW: Store relational location data
      relationalLocation: {
        northOf: northOf || 'N/A', // Store 'N/A' if empty
        southOf: southOf || 'N/A',
        eastOf: eastOf || 'N/A',
        westOf: westOf || 'N/A'
      },
      transactionHistory: [genesisTransaction]
    };
    saveLedger(landPlotsDB);
    
    alert(`Success! Land Plot ${plotId} has been registered to the OFFLINE ledger.`);
    registerForm.reset();
  });
}

if (transactionForm) {
  transactionForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const plotId = document.getElementById('transaction-plot-id').value.toUpperCase().trim();
    const newOwnerName = document.getElementById('new-owner-name').value.trim();
    const transactionType = document.getElementById('transaction-type').value;
    const transactionNotes = document.getElementById('transaction-notes').value.trim();

    if (!plotId || !newOwnerName || !transactionType) {
      alert("Please fill in all required fields for the transaction.");
      return;
    }

    let landPlotsDB = loadLedger();
    const plotToUpdate = landPlotsDB[plotId];

    if (!plotToUpdate) {
      alert(`Error: Land Plot ID "${plotId}" not found in the ledger.`);
      return;
    }

    const newTransaction = {
      type: transactionType,
      transferredFrom: plotToUpdate.currentOwnerName, 
      transferredTo: newOwnerName,
      date: new Date().toLocaleString(),
      notes: transactionNotes,
      verifiedBy: "National Land Authority" 
    };

    plotToUpdate.currentOwnerName = newOwnerName;
    plotToUpdate.transactionHistory.push(newTransaction);
    saveLedger(landPlotsDB); 
    
    alert(`Success! Transaction for Plot ID ${plotId} recorded. New owner: ${newOwnerName}.`);
    transactionForm.reset();
  });
}

if (credentialsForm) {
  credentialsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const newAccessKey = document.getElementById('new-access-key').value;

    if (currentPassword !== adminCredentials.password) {
      alert("Authentication Failed: Incorrect current password.");
      return;
    }
    if (!newPassword || !newAccessKey) {
      alert("Please enter both a new password and a new secret access key.");
      return;
    }

    adminCredentials.password = newPassword;
    adminCredentials.accessKey = newAccessKey;
    saveCredentials(newPassword, newAccessKey);

    alert("Credentials updated successfully! You will need to re-authenticate with the new credentials.");
    credentialsForm.reset();
    if (loginForm) loginForm.reset(); // Also reset login form
    adminContent.style.display = 'none';
    if (loginSection) loginSection.style.display = 'block';
  });
}

if (exportButton) {
  exportButton.addEventListener('click', () => {
    const landPlotsDB = localStorage.getItem(LEDGER_STORAGE_KEY) || "{}";
    const blob = new Blob([landPlotsDB], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meretchain_ledger_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    alert("Ledger data has been exported successfully!");
  });
}

if (importFile) {
  importFile.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const importedData = e.target.result;
        const parsedData = JSON.parse(importedData); 
        if (typeof parsedData !== 'object' || parsedData === null || Array.isArray(parsedData)) {
             throw new Error("Invalid ledger structure.");
        }
        if (confirm("Are you sure you want to overwrite the current ledger with this backup file? This action cannot be undone.")) {
          saveLedger(parsedData); 
          alert("Ledger has been successfully restored from the backup file.");
          location.reload(); 
        }
      } catch (error) {
        alert("Import failed. The selected file is not a valid ledger backup. " + error.message);
      }
    };
    reader.readAsText(file);
  });
}

if (searchForm) {
  function displayDetailedPlot(landData) {
    if (!resultsContainer) return; // Ensure resultsContainer exists
    document.getElementById('result-plot-id').innerText = `Plot ID: ${landData.plotId}`;
    document.getElementById('result-owner').innerText = landData.currentOwnerName;
    
    // GPS Link logic
    const gpsSpan = document.getElementById('result-gps');
    const gpsLink = document.getElementById('result-gps-link');
    if(gpsSpan && gpsLink){
        gpsSpan.innerText = landData.gpsCoordinates;
        // Create Google Maps link (assuming format LAT,LON - remove spaces)
        const coords = landData.gpsCoordinates.replace(/\s+/g, ''); 
        gpsLink.href = `https://www.google.com/maps?q=${coords}`;
    }

    // NEW: Display relational location data
    const relationalDiv = document.getElementById('result-relational-location');
    if(relationalDiv && landData.relationalLocation) {
        document.getElementById('result-north-of').innerText = landData.relationalLocation.northOf || 'N/A';
        document.getElementById('result-south-of').innerText = landData.relationalLocation.southOf || 'N/A';
        document.getElementById('result-east-of').innerText = landData.relationalLocation.eastOf || 'N/A';
        document.getElementById('result-west-of').innerText = landData.relationalLocation.westOf || 'N/A';
        relationalDiv.style.display = 'block'; // Make the section visible
    } else if (relationalDiv) {
        relationalDiv.style.display = 'none'; // Hide if no data
    }
    
    const historyDiv = document.getElementById('result-history');
    historyDiv.innerHTML = "";
    landData.transactionHistory.forEach(tx => {
      const entry = document.createElement('p');
      let txDetail = `<strong>${tx.type}</strong> on ${tx.date} to <i>${tx.transferredTo}</i>.`;
      if (tx.transferredFrom) txDetail += ` (From: ${tx.transferredFrom})`;
      if (tx.notes) txDetail += ` Notes: ${tx.notes}`;
      txDetail += ` (Verified by: ${tx.verifiedBy})`;
      entry.innerHTML = txDetail;
      historyDiv.appendChild(entry);
    });
    resultsContainer.style.display = 'block'; 
    if (searchResultsList) searchResultsList.innerHTML = ""; 
  }

  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const plotIdQuery = searchPlotIdInput ? searchPlotIdInput.value.toUpperCase().trim() : '';
    const ownerNameQuery = searchOwnerNameInput ? searchOwnerNameInput.value.toLowerCase().trim() : '';
    const gpsCoordsQuery = searchGpsCoordsInput ? searchGpsCoordsInput.value.toLowerCase().trim() : '';

    if (searchResultsList) searchResultsList.innerHTML = "";
    if (resultsContainer) resultsContainer.style.display = 'none';

    if (!plotIdQuery && !ownerNameQuery && !gpsCoordsQuery) {
      alert("Please enter at least one search criterion.");
      return;
    }

    const landPlotsDB = loadLedger();
    let matchingPlots = [];

    // Prioritize exact Plot ID match
    if (plotIdQuery && landPlotsDB[plotIdQuery]) {
      matchingPlots.push(landPlotsDB[plotIdQuery]);
    } else if (!plotIdQuery) { // Search by other fields only if plotIdQuery is empty
      // Iterate through all plots if searching by owner or GPS
      for (const key in landPlotsDB) {
        const plot = landPlotsDB[key];
        let matchesOwner = true; // Assume match unless proven otherwise
        let matchesGps = true;   // Assume match unless proven otherwise

        if (ownerNameQuery && !plot.currentOwnerName.toLowerCase().includes(ownerNameQuery)) {
          matchesOwner = false;
        }
        if (gpsCoordsQuery && !plot.gpsCoordinates.toLowerCase().includes(gpsCoordsQuery)) {
          matchesGps = false;
        }

        // Logic to combine matches:
        // If searching by owner and it matches (and GPS is either not searched or also matches)
        // OR if searching by GPS and it matches (and owner is either not searched or also matches)
        if ((ownerNameQuery && matchesOwner && (!gpsCoordsQuery || matchesGps)) || 
            (gpsCoordsQuery && matchesGps && (!ownerNameQuery || matchesOwner))) {
            // Ensure at least one actual search term was provided if we reach here
            if(!ownerNameQuery && !gpsCoordsQuery) continue; // Should not happen with initial check but safety
            matchingPlots.push(plot);
        }
      }
    }

    if (matchingPlots.length === 0) {
      if (searchResultsList) searchResultsList.innerHTML = "<p>No matching land plots found. Please try different criteria.</p>";
    } else if (matchingPlots.length === 1 && plotIdQuery) {
      // If a single exact plotId match, show details directly
      displayDetailedPlot(matchingPlots[0]);
    } else {
      // Display a list of multiple matches
      if (!searchResultsList) return; // Should not happen if searchForm exists
      matchingPlots.forEach(plot => {
        const plotCard = document.createElement('div');
        plotCard.classList.add('search-result-card');
        plotCard.innerHTML = `
          <h3>${plot.plotId}</h3>
          <p>Current Owner: <strong>${plot.currentOwnerName}</strong></p>
          <p>GPS: ${plot.gpsCoordinates}</p>
          <span>View Details →</span>
        `;
        // Attach click listener to show detailed view
        plotCard.addEventListener('click', () => displayDetailedPlot(plot));
        searchResultsList.appendChild(plotCard);
      });
      // Inform user if there are many results
      if (matchingPlots.length > 1) {
          const info = document.createElement('p');
          info.innerHTML = `<em>${matchingPlots.length} results found. Click a card to view details.</em>`;
          searchResultsList.prepend(info);
      }
    }
  });
}