

const filterInput = document.getElementById('filterInput');
const optionsList = document.getElementById('optionsList');


document.addEventListener('DOMContentLoaded', async () => {


  const response = await fetch('/getHistory');
  const historyData = await response.json();
  console.log(historyData)
  const historyTableBody = document.querySelector('#historyTable tbody');
  historyTableBody.innerHTML = '';  // Clear existing rows in the table

  // Loop through the data and create rows for each measurement
  historyData.forEach(item => {

    const { formattedDate: startTime, milliseconds: startTimeMs } = formatTimestamp(item.start_time);
    const { formattedDate: endTime, milliseconds: endTimeMs } = formatTimestamp(item.end_time);

    console.log(startTime)

    const row = document.createElement('tr');

    // Create ID cell
    // const idCell = document.createElement('td');
    // idCell.textContent = item.id;
    // row.appendChild(idCell);

    // Create Title cell
    const titleCell = document.createElement('td');
    titleCell.textContent = item.title;
    row.appendChild(titleCell);

    const startTimeCell = document.createElement('td');
    startTimeCell.textContent = startTime;
    row.appendChild(startTimeCell);

    const endTimeCell = document.createElement('td');
    endTimeCell.textContent = endTime;
    row.appendChild(endTimeCell);

    // Create Description cell (first 5 words)
    const descriptionCell = document.createElement('td');
    const descriptionWords = item.description.split(' ').slice(0, 5).join(' ');

    descriptionCell.textContent = descriptionWords + '...';

    // Create a custom tooltip element
    const tooltip = document.createElement('div');
    tooltip.className = 'custom-tooltip';
     
    tooltip.innerHTML = item.description.replace(/\n/g, '<br>');
    document.body.appendChild(tooltip);

    // Show tooltip on mouseover
    descriptionCell.addEventListener('mouseover', (e) => {
      tooltip.style.display = 'block';
      tooltip.style.left = (e.pageX + 10) + 'px';
      tooltip.style.top = (e.pageY + 10) + 'px';
    });

    // Move tooltip with mouse
    descriptionCell.addEventListener('mousemove', (e) => {
      tooltip.style.left = (e.pageX + 10) + 'px';
      tooltip.style.top = (e.pageY + 10) + 'px';
    });

    // Hide tooltip on mouseout
    descriptionCell.addEventListener('mouseout', () => {
      tooltip.style.display = 'none';
    });


    row.appendChild(descriptionCell);

    const menuCell = document.createElement('td');
    const showDataBtn = document.createElement('button')
    const DeleteDataBtn = document.createElement('button')

    showDataBtn.textContent = 'Zobrazit'
    DeleteDataBtn.textContent = 'Smazat'
    menuCell.appendChild(showDataBtn)
    menuCell.appendChild(DeleteDataBtn)
    row.appendChild(menuCell)
    historyTableBody.appendChild(row);
    showDataBtn.addEventListener('click', () => {
      const grafanaUrl = ` http://raspberrypi:3000/d/bedy5ps5puha8e/fermentation?orgId=1&from=${startTimeMs}&to=${endTimeMs}&timezone=browser&var-query0=${item.id}`;
      window.open(grafanaUrl, '_blank');
    })


    DeleteDataBtn.addEventListener('click', async (e) => {


      if (confirm(`Opravdu chcete data záznamu"${item.title}" smazat?`)) {
        try {
          const response = await fetch(`/deleteMeasurement/${item.id}`, {
            method: 'DELETE'
          });
          if (response.ok) {
            // Remove row from table
            row.remove();
            alert('Deleted successfully.');
          } else {
            alert('Failed to delete.');
          }
        } catch (err) {
          console.error('Error deleting:', err);
          alert('Error deleting.');
        }
      }
    });
  })



});









function formatTimestamp(timestamp) {
  const date = new Date(timestamp);

  const formattedDate = date.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const milliseconds = date.getTime();

  return { formattedDate, milliseconds };
}

