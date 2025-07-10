function updateDateTime() {
    const dt = new Date();
    document.getElementById("datetime").innerHTML = dt.toLocaleString();
}

// Update once immediately
updateDateTime();

setInterval(updateDateTime, 1000);