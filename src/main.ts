import {dropdownOptions, errorModal, restaurantModal, restaurantRow} from './components';
import {fetchData} from './functions';
import {apiUrl, uploadUrl, positionOptions} from './variables';
import {Restaurant} from './interfaces/Restaurant';
import {WeeklyMenu, DailyMenu} from './interfaces/Menu';
import {LoginUser, RegisterUser, User} from './interfaces/User';
import { registerSW } from 'virtual:pwa-register';
import { map, latLng, tileLayer, MapOptions, marker } from "leaflet";
import 'leaflet/dist/leaflet.css';
import 'haversine-distance';
import haversineDistance from 'haversine-distance';

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('onNeedRefresh');
    const update = confirm('New version available. Update?');
    if (update) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('onOfflineReady');
    alert('App is offline ready');
  },
});

let dailySelected = false;
let weeklySelected = false;
let citySelected = 'Kaikki kaupungit';
let companySelected = 'Kaikki yritykset';
let loggedIn = false;

const selection = document.querySelector('select');
if (!selection) {
  throw new Error('Selection not found!');
}
dropdownOptions(selection);

const selectedCity = (sel: HTMLSelectElement) => {
  citySelected = sel.options[sel.selectedIndex].text;
  console.log(citySelected);
}

const modal = document.querySelector('#restaurant-screen') as HTMLDialogElement | null;
if (!modal) {
  throw new Error('Modal not found');
}
modal.addEventListener('click', () => {
  modal.close();
});

const calcDist = (myLat: number, myLng: number, theirLat: number, theirLng: number) => {

  const myLoc = {
    lat: myLat,
    lng: myLng
  }

  const theirLoc = {
    lat: theirLat,
    lng: theirLng
  }

  const distance = haversineDistance(myLoc, theirLoc) / 1000;
  return distance;
}

const login = async (user: {
  username: string;
  password: string;
  }): Promise<LoginUser> => {
    const options: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(user),
    };
    return await fetchData<LoginUser>(apiUrl + '/auth/login', options);
};

const register = async (user: {
  username: string;
  password: string;
  email: string;
}): Promise<RegisterUser> => {
  console.log('Registration function accessed');
  const options: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(user),
  };
  return await fetchData<RegisterUser>(apiUrl + '/users', options);
}

const getUserData = async (token: string): Promise<User> => {
  const options: RequestInit = {
    headers: {
      Authorization: 'Bearer ' + token,
    }
  };
  return await fetchData<User>(apiUrl + '/users/token', options)
};

const addUserDataToDom = (user: User): void => {
  console.log('addUserDataToDom reached');
  const navRight = document.querySelector('#nav-right');

  if (!navRight) {
    return;
  }
  navRight.innerHTML = '';
  const userTarget = document.createElement('span');
  const usernameText = document.createElement('p');
  userTarget.id = "user-target";
  usernameText.id = "username-display";
  usernameText.innerHTML = user.username;
  const avatarTarget = document.createElement('img');
  avatarTarget.id = "avatar-target";
  if (user.avatar) {
    avatarTarget.src = uploadUrl + user.avatar;
  } else {
    avatarTarget.src = './img/empty-user.png';
  }
  const dropdownArrow = document.createElement('img');
  dropdownArrow.id = "dropdown-arrow";
  dropdownArrow.src = './img/dropdown-arrow.png';

  const dropdownContent = document.createElement('div');
  dropdownContent.classList.add("dropdown-content");
  dropdownContent.classList.add("hidden");
  dropdownContent.id = "dropdown";

  const faveRestaurants = document.createElement('p');
  faveRestaurants.id = "fav-restaurants";
  faveRestaurants.innerText = 'Suosikit';

  const logoutBtn = document.createElement('p');
  logoutBtn.id = "logout-btn";
  logoutBtn.innerText = 'Kirjaudu ulos';

  dropdownContent.appendChild(faveRestaurants);
  dropdownContent.appendChild(logoutBtn);

  userTarget.appendChild(avatarTarget);
  userTarget.appendChild(usernameText);
  userTarget.appendChild(dropdownArrow);
  userTarget.appendChild(dropdownContent);

  let dropdownVisible = false;

  dropdownArrow.addEventListener('click', () => {
    if (!dropdownVisible) {
      dropdownContent.classList.replace('hidden', 'visible');
      dropdownVisible = true;
    } else {
      dropdownContent.classList.replace('visible', 'hidden');
      dropdownVisible = false;
    }
  });

  navRight.appendChild(userTarget);

};

const deleteUserDataFromDOM = (): void => {
  console.log('Deleting user data from DOM...');
  const navRight = document.querySelector('#nav-right');

  if (!navRight) {
    return;
  }
  navRight.innerHTML = '';
  navRight.insertAdjacentHTML('beforeend', `<button id="kirj-rekist">Kirjaudu</button>`);

}

const checkToken = async (): Promise<void> => {
  const token = localStorage.getItem('token');
  if (!token) {
    return;
  }

  const userData = await getUserData(token);
  addUserDataToDom(userData);
};

const createTable = (restaurants: Restaurant[], pos: GeolocationPosition) => {
  const table = document.querySelector('table');
  if (!table) throw new Error('Table not found!');
  table.innerHTML = '';

  restaurants.forEach((restaurant, index) => {
    const distance = calcDist(pos.coords.latitude, pos.coords.longitude, restaurant.location.coordinates[1], restaurant.location.coordinates[0])
    const tr = restaurantRow(restaurant);
    if (index === 0) tr.classList.add('nearest');
    const distTd = document.createElement('td');
    distTd.innerText = distance.toFixed(1).toString() + " km";
    const starCont = document.createElement('td');
    starCont.classList.add('star-cont');
    const faveStar = document.createElement('img');
    faveStar.src = './img/empty-star.png';
    faveStar.id = 'fave-star';
    starCont.appendChild(faveStar);
    tr.appendChild(distTd);
    tr.appendChild(starCont);
    table.appendChild(tr);

    faveStar.addEventListener('mouseover', () => {
      faveStar.src = './img/hover-star.png';
    });

    faveStar.addEventListener('mouseout', () => {
      faveStar.src = './img/empty-star.png';
    });

    faveStar.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!loggedIn) {
        alert('Kirjaudu sisään suosikkien tallentamiseksi!');
        return;
      } else {
        faveStar.src = './img/fave-star.png';
        tr.classList.add('favorite');
      };
    })


    tr.addEventListener('click', async () => {
      try {
        // remove all highlights
        const allHighs = document.querySelectorAll('.highlight');
        allHighs.forEach((high) => {
          high.classList.remove('highlight');
        });
        // add highlight
        tr.classList.add('highlight');
        // add restaurant data to modal
        modal.innerHTML = '';

        // fetch menu
        if (dailySelected) {
        const menu = await fetchData<DailyMenu>(
          apiUrl + `/restaurants/daily/${restaurant._id}/fi`
        );
        console.log(menu);

        const menuHtml = restaurantModal(restaurant, menu);
        modal.insertAdjacentHTML('beforeend', menuHtml);
        const options: MapOptions = {
          center: latLng(restaurant.location.coordinates[1], restaurant.location.coordinates[0]),
          zoom: 4.5,
        };

        const mymap = map('map', options);

        tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(mymap);

        marker([restaurant.location.coordinates[1], restaurant.location.coordinates[0]]).addTo(mymap);
        } else if (weeklySelected) {
          const menu = await fetchData<WeeklyMenu>(
            apiUrl + `/restaurants/weekly/${restaurant._id}/fi`
          );
          console.log(menu);

          const menuHtml = restaurantModal(restaurant, menu);
          modal.insertAdjacentHTML('beforeend', menuHtml);
          const options: MapOptions = {
            center: latLng(restaurant.location.coordinates[1], restaurant.location.coordinates[0]),
            zoom: 4.5,
          };

          const mymap = map('map', options);

          tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
              maxZoom: 19,
              attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          }).addTo(mymap);

          marker([restaurant.location.coordinates[1], restaurant.location.coordinates[0]]).addTo(mymap);
        } else {
          modal.insertAdjacentHTML('beforeend', '<span>X</span><p style="margin-top:3rem;">Valitse ensin ruokalista!</p>');
        }

        modal.showModal();
      } catch (error) {
        modal.innerHTML = errorModal((error as Error).message);
        modal.showModal();
      }
    });
  });
};

const error = (err: GeolocationPositionError) => {
  console.warn(`ERROR(${err.code}): ${err.message}`);
};

const success = async (pos: GeolocationPosition) => {
  try {
    const crd = pos.coords;
    console.log(crd);
    const restaurants = await fetchData<Restaurant[]>(apiUrl + '/restaurants');
    console.log(restaurants);
    restaurants.sort((a: Restaurant, b: Restaurant) => {
      const x1 = crd.latitude;
      const y1 = crd.longitude;
      const x2a = a.location.coordinates[1];
      const y2a = a.location.coordinates[0];
      const distanceA = calcDist(x1, y1, x2a, y2a);
      const x2b = b.location.coordinates[1];
      const y2b = b.location.coordinates[0];
      const distanceB = calcDist(x1, y1, x2b, y2b);
      return distanceA - distanceB;
    });

    const restBtns = document.querySelectorAll('.ravnappi');
    const sodexoBtn = document.querySelector('#sodexo');
    const compassBtn = document.querySelector('#compass');
    const allBtn = document.querySelector('#kaikki');

    const menuBtns = document.querySelectorAll('.menunappi');
    const dailyBtn = document.querySelector('#daily');
    const wklyBtn = document.querySelector('#weekly');

    const searchBtn = document.querySelector('#haku');

    if (!restBtns || !sodexoBtn || !compassBtn || !allBtn) throw new Error('Button not found!');

    sodexoBtn.addEventListener('click', () => {
      for (let i = 0; i < restBtns.length; i++) {
        restBtns[i].classList.remove('focus');
      }
      sodexoBtn.classList.add('focus');
      companySelected = 'Sodexo';
    });

    compassBtn.addEventListener('click', () => {
      for (let i = 0; i < restBtns.length; i++) {
        restBtns[i].classList.remove('focus');
      }
      compassBtn.classList.add('focus');
      companySelected = 'Compass Group';
    });

    allBtn.addEventListener('click', () => {
      for (let i = 0; i < restBtns.length; i++) {
        restBtns[i].classList.remove('focus');
      }
      allBtn.classList.add('focus');
    });

    dailyBtn?.addEventListener('click', () => {
      for (let btn of menuBtns) {
        btn.classList.remove('focus');
      }
      dailyBtn.classList.add('focus');
      dailySelected = true;
      weeklySelected = false;

    })

    wklyBtn?.addEventListener('click', () => {
      for (let btn of menuBtns) {
        btn.classList.remove('focus');
      }
      wklyBtn.classList.add('focus');
      weeklySelected = true;
      dailySelected = false;

    })

    const cityFilter = <HTMLSelectElement>document.querySelector('#kaupungit');
    cityFilter.addEventListener('change', () => {
      selectedCity(cityFilter);
    });
    console.log(citySelected);

    searchBtn?.addEventListener('click', () => {
      if (citySelected === 'Kaikki kaupungit' && companySelected === 'Kaikki yritykset') {
        createTable(restaurants, pos)
      }
      if (citySelected === 'Kaikki kaupungit' && companySelected != 'Kaikki yritykset') {
        const filtered = restaurants.filter((restaurant: Restaurant) => restaurant.company === companySelected);
        createTable(filtered, pos);
      }
      if (citySelected != 'Kaikki kaupungit' && companySelected === 'Kaikki yritykset') {
        const filtered = restaurants.filter((restaurant: Restaurant) => restaurant.city === citySelected);
        createTable(filtered, pos);
      }
      if (citySelected != 'Kaikki kaupungit' && companySelected != 'Kaikki yritykset') {
        const filtered = restaurants.filter((restaurant: Restaurant) => restaurant.city === citySelected && restaurant.company === companySelected);
        if (!filtered) alert('Valitsemillasi suodattimilla ei löytynyt ravintoloita!');
        createTable(filtered, pos);
      }
    });


    const loginDialog = <HTMLDialogElement>document.querySelector("#login-screen");
    const openDialogBtn = document.querySelector('#kirj-rekist');
    const formContainer = document.querySelector('.form-cont');

    const loginTab = <HTMLHeadingElement>document.querySelector('#login');
    const loginForm = document.querySelector('#login-form');
    const usernameInput = document.querySelector('#username') as HTMLInputElement | null;
    const passwordInput = document.querySelector('#password') as HTMLInputElement | null;

    const registerTab = <HTMLElement>document.querySelector('#register');


    if (!loginDialog || !formContainer) throw new Error('No login dialog found!')

    const openDialog = () => {
      loginDialog.showModal();
    };

    const closeDialog = (e: Event) => {
      e.preventDefault();
      loginDialog.close();
    };

    openDialogBtn?.addEventListener("click", openDialog);


    registerTab?.addEventListener("click", () => {
      if (loginTab.classList.contains('open-tab')) {
      loginTab.classList.remove('open-tab');
      registerTab.classList.add('open-tab');
      formContainer.innerHTML = '';
      let html = `
      <form method="get" class="form-example" id="register-form">
      <div class="form-example">
        <label for="regist-username">Käyttäjänimi: </label>
        <input type="text" name="username" id="regist-username" minlength="3" required>
      </div>
      <div class="form-example">
        <label for="regist-email">Sähköposti: </label>
        <input type="email" name="email" id="regist-email" required>
      </div>
      <div class="form-example">
          <label for="regist-password">Salasana: </label>
          <input type="password" name="password" id="regist-password" required>
      </div>
      <div class="form-example">
          <label for="regist-password2">Salasana uudelleen: </label>
          <input type="password" name="password2" id="regist-password2" title="Anna sama salasana uudelleen!" required>
      </div>
      <div class="regist-button">
        <input type="submit" value="Rekisteröidy" id="rekisteroidy">
      </div>
      </form>
      `;
      formContainer.insertAdjacentHTML('beforeend', html);
      console.log('Register tab clicked');

      const registerForm = document.querySelector('#register-form') as HTMLFormElement | null;
      const registUsername = document.querySelector('#regist-username') as HTMLInputElement | null;
      const registEmail = document.querySelector('#regist-email') as HTMLInputElement | null;
      const regPswd = document.querySelector('#regist-password') as HTMLInputElement | null;
      const regPswd2 = document.querySelector('#regist-password2') as HTMLInputElement | null;

      registerForm?.addEventListener('submit', async (e) => {
        console.log('Registration started');
        e.preventDefault();

        if (!registUsername || !registEmail || !regPswd || !regPswd2) return;

        if (regPswd.value != regPswd2.value) {
          alert('Salasanat eivät täsmää! Yritä uudelleen!');
          return;
        }
        const user = {
          username: registUsername.value,
          password: regPswd.value,
          email: registEmail.value
        };

        console.log('Registering user...');
        const registData = await register(user);
        console.log(registData.message);
        if (registData.message === "user created") {
          loginDialog.close();
          const activationPopup = document.querySelector('#activate') as HTMLDialogElement | null;
          const activationLink = document.createElement('a');
          activationLink.href = registData.activationUrl;
          activationLink.innerText = 'TÄSTÄ';

          activationPopup?.insertAdjacentHTML('beforeend', 'Aktivoi tilisi ' + activationLink);
          activationPopup?.showModal();
        }
      })
    };
    });


    loginTab?.addEventListener("click", () => {
      if (registerTab.classList.contains('open-tab')) {
        registerTab.classList.remove('open-tab');
        loginTab.classList.add('open-tab');
        formContainer.innerHTML = '';
        let html = `
        <form method="post" class="form-example" id="login-form">
        <div class="form-example">
          <label for="username">Käyttäjänimi: </label>
          <input type="text" name="username" id="username" minlength="3" required>
       </div>
        <div class="form-example">
            <label for="password">Salasana: </label>
            <input type="password" name="password" id="password" required>
        </div>
        <div class="login-button">
          <input type="submit" value="Kirjaudu" id="kirjaudu-btn">
        </div>
        </form>
        `;
        formContainer.insertAdjacentHTML('beforeend', html);
      };
    });

    const logoutBtn = document.querySelector('#logout-btn') as HTMLButtonElement | null;

    logoutBtn?.addEventListener('click', () => {
      deleteUserDataFromDOM();
      localStorage.clear();
      checkToken();
      location.reload();
    })
    console.log(loginForm);

    loginForm?.addEventListener('submit', async (evt) => {
      console.log('Login form submission started');
      evt.preventDefault();
      if (!usernameInput || !passwordInput) return;

      const user = {
        username: usernameInput.value,
        password: passwordInput.value,
      };

      console.log('Logging in...');
      const loginData = await login(user);
      console.log(loginData);
      loggedIn = true;

      localStorage.setItem('token', loginData.token);
      addUserDataToDom(loginData.data);
      console.log('User data added to DOM!');
      closeDialog(evt);
      checkToken();
    });


  } catch (error) {
    modal.innerHTML = errorModal((error as Error).message);
    modal.showModal();
  }
};


if (confirm('Annatko sivulle luvan käyttää sijaintitietojasi?')) navigator.geolocation.getCurrentPosition(success, error, positionOptions);
