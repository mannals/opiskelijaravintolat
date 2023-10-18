import { Restaurant } from "./interfaces/Restaurant";
import { WeeklyMenu, DailyMenu } from "./interfaces/Menu";

const dropdownOptions = (container: HTMLSelectElement) => {
  fetch('./src/cities.txt').then(response => response.text()).then((text) => {
    text.split(/\r\n|\n/).forEach((line) => {
      const option = document.createElement('option');
      option.innerText = line;
      container.appendChild(option);
    })
  })
}

const restaurantRow = (restaurant: Restaurant) => {
  const {name, address} = restaurant;
  const tr = document.createElement('tr');
  const nameCell = document.createElement('td');
  nameCell.innerText = name;
  const addressCell = document.createElement('td');
  addressCell.innerText = address;
  tr.appendChild(nameCell);
  tr.appendChild(addressCell);
  return tr;
};

const restaurantModal = (restaurant: Restaurant, menu: WeeklyMenu | DailyMenu) => {
  const {name, address, city, postalCode, phone, company} = restaurant;
  let html = `<span class="close">X</span>
  <div id="rest-info">
    <h2 id="restaurant-name">${name}</h2>
    <p>${company}</p>
    <p>${address} ${postalCode} ${city}</p>
    <p>${phone}</p>
  </div>
  <div id="map"></div>`;
  console.log(menu);
  if ('days' in menu) {
    menu.days.forEach((day: DailyMenu) => {
      const {date, courses} = day;
      html += `<h3>${date}</h3>
              <table id="courses">
                <tr id="table-headers">
                  <th>Ruokalaji</th>
                  <th>Dieetit</th>
                  <th>Hinta</th>
                </tr>`;
      courses.forEach((course) => {
        const {name, diets, price} = course;
        html += `
              <tr id="course-row">
                <td>${name}</td>
                <td>${diets ?? ' - '}</td>
                <td>${price ?? ' - '}</td>
              </tr>
            `;
      })
      html += '</table>'
    })
  } else if (menu) {
    html += `<table id="courses">
    <tr id="table-headers">
      <th>Ruokalaji</th>
      <th>Dieetit</th>
      <th>Hinta</th>
    </tr>`;
    menu.courses.forEach((course) => {
      const {name, diets, price} = course;
      html += `
            <tr id="course-row">
              <td>${name}</td>
              <td>${diets ?? ' - '}</td>
              <td>${price ?? ' - '}</td>
            </tr>
            `;
    });
    html += '</table>';
  }

  return html;
};

const errorModal = (message: string) => {
  const html = `
        <h3>Error</h3>
        <p>${message}</p>
        `;
  return html;
};

export {dropdownOptions, restaurantRow, restaurantModal, errorModal};
