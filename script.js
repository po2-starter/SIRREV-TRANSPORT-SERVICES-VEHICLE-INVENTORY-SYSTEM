// --- START OF FILE script.js ---

// Global variable to hold the Chart.js instance
let rentalChartInstance = null;

// --- DOM Elements ---
const renterInput = document.getElementById('renter');
const carTypeInput = document.getElementById('carType');
const carNumberInput = document.getElementById('carNumber');
const dueDateInput = document.getElementById('dueDate');
const returnedInput = document.getElementById('returned');
const recordTableBody = document.getElementById('recordTable');
const searchBox = document.getElementById('searchBox');
const summaryElement = document.getElementById('summary');
const dueSoonListElement = document.getElementById('dueSoonList');
const chartCanvas = document.getElementById('rentalChart').getContext('2d');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  loadRecords(); // Load records from localStorage on page load
});

// --- Core Functions ---

/**
 * Gets rental records from localStorage.
 * @returns {Array} An array of rental record objects.
 */
function getRecords() {
  const records = localStorage.getItem('rentalRecords');
  try {
    // Ensure we return an array, even if localStorage is empty or corrupted
    const parsedRecords = records ? JSON.parse(records) : [];
    return Array.isArray(parsedRecords) ? parsedRecords : [];
  } catch (e) {
    console.error("Error parsing records from localStorage:", e);
    return []; // Return empty array on error
  }
}

/**
 * Saves rental records to localStorage.
 * @param {Array} records - The array of rental record objects to save.
 */
function saveRecords(records) {
  try {
    localStorage.setItem('rentalRecords', JSON.stringify(records));
  } catch (e) {
    console.error("Error saving records to localStorage:", e);
    alert("Could not save records. LocalStorage might be full or disabled.");
  }
}

/**
 * Renders the rental records into the HTML table and updates related UI elements.
 */
function renderTable() {
  const records = getRecords();
  recordTableBody.innerHTML = ''; // Clear existing table rows

  if (records.length === 0) {
    recordTableBody.innerHTML = '<tr><td colspan="7" class="text-center">No rental records found.</td></tr>';
  } else {
    // Sort records by entry date (newest first) for better viewing
    records.sort((a, b) => new Date(b.entryDate) - new Date(a.entryDate));

    records.forEach(record => {
      const row = recordTableBody.insertRow();
      row.setAttribute('data-id', record.id); // Add data-id for easier manipulation

      // Format dates for display
      const entryDateFormatted = record.entryDate ? new Date(record.entryDate).toLocaleDateString() : 'N/A';
      const dueDateFormatted = record.dueDate ? new Date(record.dueDate).toLocaleDateString() : 'N/A';

      row.innerHTML = `
        <td>${entryDateFormatted}</td>
        <td>${record.renter || 'N/A'}</td>
        <td>${record.carType || 'N/A'}</td>
        <td>${record.carNumber || 'N/A'}</td>
        <td>${dueDateFormatted}</td>
        <td>
          <input type="checkbox" ${record.returned ? 'checked' : ''} onclick="toggleReturned('${record.id}', this.checked)" title="Toggle Return Status">
          <span class="ms-1">${record.returned ? 'Yes' : 'No'}</span>
        </td>
        <td>
          <button class="btn btn-danger btn-sm" onclick="deleteRecord('${record.id}')">Delete</button>
        </td>
      `;
      // Add styling for overdue items that are not returned
       if (!record.returned && record.dueDate && new Date(record.dueDate) < new Date().setHours(0,0,0,0)) {
            row.classList.add('table-danger'); // Bootstrap class for danger/overdue
            row.title = "This rental is overdue!";
       }
    });
  }

  // Update other UI elements after rendering
  updateSummary();
  updateChart();
  updateDueSoon();
  filterRecords(); // Re-apply filter after rendering
}

/**
 * Adds a new rental record.
 */
function addRecord() {
  const renter = renterInput.value.trim();
  const carType = carTypeInput.value.trim();
  const carNumber = carNumberInput.value.trim();
  const dueDate = dueDateInput.value;
  const returned = returnedInput.checked;

  // Basic validation
  if (!renter || !carType || !carNumber || !dueDate) {
    alert('Please fill in Renter Name, Car Name/Type, Car Number, and Due Date.');
    return;
  }

  const newRecord = {
    id: `record-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, // More robust unique ID
    entryDate: new Date().toISOString().split('T')[0], // Store entry date as YYYY-MM-DD
    renter: renter,
    carType: carType,
    carNumber: carNumber,
    dueDate: dueDate,
    returned: returned,
  };

  const records = getRecords();
  records.push(newRecord);
  saveRecords(records);
  renderTable(); // Re-render the table with the new record

  // Clear the form fields
  renterInput.value = '';
  carTypeInput.value = '';
  carNumberInput.value = '';
  dueDateInput.value = '';
  returnedInput.checked = false;
}

/**
 * Deletes a rental record by its ID.
 * @param {string} id - The unique ID of the record to delete.
 */
function deleteRecord(id) {
  if (confirm('Are you sure you want to delete this record?')) {
    let records = getRecords();
    records = records.filter(record => record.id !== id);
    saveRecords(records);
    renderTable(); // Re-render the table
  }
}

/**
 * Toggles the 'returned' status of a rental record.
 * @param {string} id - The unique ID of the record to update.
 * @param {boolean} isReturned - The new returned status.
 */
function toggleReturned(id, isReturned) {
  let records = getRecords();
  const recordIndex = records.findIndex(record => record.id === id);
  if (recordIndex > -1) {
    records[recordIndex].returned = isReturned;
    saveRecords(records);
    renderTable(); // Re-render to update visual status and potential styling
  } else {
    console.error("Record not found for toggling status:", id);
  }
}


/**
 * Filters the displayed table rows based on the search box input.
 */
function filterRecords() {
    const filter = searchBox.value.toLowerCase();
    const rows = recordTableBody.getElementsByTagName('tr');

    // Check if the table body contains the "No records" message
    if (rows.length === 1 && rows[0].getElementsByTagName('td').length === 1 && rows[0].textContent.includes("No rental records found")) {
        return; // No records to filter
    }

    for (let i = 0; i < rows.length; i++) {
        const cells = rows[i].getElementsByTagName('td');
        let match = false;
        // Check all cells except the Action button cell
        for (let j = 0; j < cells.length - 1; j++) {
            if (cells[j]) {
                // For the checkbox cell, check the text next to it ('Yes'/'No')
                const cellText = cells[j].querySelector('span')
                               ? cells[j].querySelector('span').textContent.toLowerCase()
                               : cells[j].textContent.toLowerCase();
                if (cellText.includes(filter)) {
                    match = true;
                    break;
                }
            }
        }
        rows[i].style.display = match ? '' : 'none';
    }
}


/**
 * Exports the current rental records to a CSV file.
 */
function exportToCSV() {
  const records = getRecords();
  if (records.length === 0) {
    alert('No records to export.');
    return;
  }

  // Define CSV headers
  const headers = ['EntryDate', 'Renter', 'CarNameType', 'CarNumber', 'DueDate', 'Returned'];
  // Convert records array to CSV string
  const csvContent = [
    headers.join(','), // Header row
    ...records.map(record => [
      record.entryDate ? new Date(record.entryDate).toLocaleDateString() : '',
      `"${record.renter.replace(/"/g, '""')}"`, // Escape double quotes within renter name
      `"${record.carType.replace(/"/g, '""')}"`, // Escape double quotes
      `"${record.carNumber.replace(/"/g, '""')}"`, // Escape double quotes
      record.dueDate ? new Date(record.dueDate).toLocaleDateString() : '',
      record.returned ? 'Yes' : 'No'
    ].join(',')) // Data rows
  ].join('\n'); // Join rows with newline characters

  // Create a Blob and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) { // Feature detection
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `vehicle_rental_records_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    alert("CSV export is not supported in your browser.");
  }
}

/**
 * Updates the summary text (total records, returned, outstanding).
 */
function updateSummary() {
  const records = getRecords();
  const totalRecords = records.length;
  const returnedCount = records.filter(record => record.returned).length;
  const outstandingCount = totalRecords - returnedCount;

  summaryElement.textContent = `Total Records: ${totalRecords} | Returned: ${returnedCount} | Outstanding: ${outstandingCount}`;
}

/**
 * Updates the Chart.js chart with current rental status.
 */
function updateChart() {
  const records = getRecords();
  const returnedCount = records.filter(record => record.returned).length;
  const outstandingCount = records.length - returnedCount;

  // Destroy previous chart instance if it exists
  if (rentalChartInstance) {
    rentalChartInstance.destroy();
  }

  // Create new chart instance
  rentalChartInstance = new Chart(chartCanvas, {
    type: 'doughnut', // Use doughnut or pie
    data: {
      labels: ['Returned', 'Outstanding'],
      datasets: [{
        label: 'Rental Status',
        data: [returnedCount, outstandingCount],
        backgroundColor: [
          'rgba(75, 192, 192, 0.7)', // Greenish for returned
          'rgba(255, 99, 132, 0.7)',  // Reddish for outstanding
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 99, 132, 1)',
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true, // Adjust as needed, true might be better for doughnuts
       plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: 'Vehicle Return Status Overview'
            }
        }
    }
  });
}

/**
 * Updates the "Due Soon" list.
 */
function updateDueSoon() {
  const records = getRecords();
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize today's date to the beginning of the day

  const soonThreshold = new Date(today);
  soonThreshold.setDate(today.getDate() + 7); // Define "soon" as within the next 7 days

  const dueSoonRecords = records.filter(record => {
    if (record.returned || !record.dueDate) return false; // Ignore returned or undated records
    const dueDate = new Date(record.dueDate);
    dueDate.setHours(0,0,0,0); // Normalize due date
    return dueDate >= today && dueDate <= soonThreshold; // Due date is between today and 7 days from now
  }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)); // Sort by soonest due date first

  dueSoonListElement.innerHTML = ''; // Clear previous list

  if (dueSoonRecords.length === 0) {
    dueSoonListElement.innerHTML = '<li>No vehicles due back within the next 7 days.</li>';
  } else {
    dueSoonRecords.forEach(record => {
      const li = document.createElement('li');
      const dueDateFormatted = new Date(record.dueDate).toLocaleDateString();
      li.textContent = `${record.carType} (${record.carNumber}) rented by ${record.renter} - Due: ${dueDateFormatted}`;
      // Optionally add styling for very soon items
      const daysUntilDue = (new Date(record.dueDate) - today) / (1000 * 60 * 60 * 24);
      if (daysUntilDue <= 2) {
           li.style.fontWeight = 'bold';
           li.style.color = 'orange'; // Highlight items due very soon
           li.title = `Due in ${Math.ceil(daysUntilDue)} day(s)!`;
      }
      dueSoonListElement.appendChild(li);
    });
  }
}


// --- Initial Load ---
// Call renderTable() on load to display initial data from localStorage
// Wrapped inside DOMContentLoaded listener above.
// --- END OF FILE script.js ---// JavaScript logic goes here (addRecord, filterRecords, exportToCSV, chart rendering, etc.)