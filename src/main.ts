import {dropdownOptions, errorModal, restaurantModal, restaurantRow} from './components';
import {fetchData} from './functions';
import {apiUrl, uploadUrl, positionOptions} from './variables';
import {Restaurant} from './interfaces/Restaurant';
import {WeeklyMenu, DailyMenu} from './interfaces/Menu';
import {LoginUser, RegisterUser, UpdateUser, User} from './interfaces/User';
import { UpdateResult } from './interfaces/UpdateResult';
import { UploadResult } from './interfaces/UploadResult';
import { registerSW } from 'virtual:pwa-register';
import { map, latLng, tileLayer, MapOptions, marker } from "leaflet";
import 'leaflet/dist/leaflet.css';
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

const updateUserData = async (
  user: UpdateUser,
  token: string
): Promise<UpdateResult> => {
  const options: RequestInit = {
    method: 'PUT',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(user)
  }
  return await fetchData(apiUrl + '/users', options)
};

const uploadAvatar = async (
  image: File,
  token: string
): Promise<UploadResult> => {
  const formData = new FormData();
  formData.append('avatar', image);

  const options: RequestInit = {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token
    },
    body: formData
  };
  return await fetchData(apiUrl + '/users/avatar', options)
}

const addUserDataToDom = (user: User): void => {
  console.log('addUserDataToDom reached');
  const navRight = document.querySelector('#nav-right');

  const profUsername = document.querySelector('#prof-username-target') as HTMLSpanElement | null;
  const profEmail = document.querySelector('#prof-email-target') as HTMLSpanElement | null;
  const profAvatar = document.querySelector('#prof-avatar-target') as HTMLImageElement | null;

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
    if (profAvatar) profAvatar.src = uploadUrl + user.avatar;
  } else {
    avatarTarget.src = './img/empty-user.png';
    if (profAvatar) profAvatar.src = './img/empty-user.png';
  }
  const dropdownArrow = document.createElement('img');
  dropdownArrow.id = "dropdown-arrow";
  dropdownArrow.src = './img/dropdown-arrow.png';

  const dropdownContent = document.createElement('div');
  dropdownContent.classList.add("dropdown-content");
  dropdownContent.classList.add("hidden");
  dropdownContent.id = "dropdown";

  const profileSettings = document.createElement('p');
  profileSettings.id = "profile-settings";
  profileSettings.classList.add('dropdown-item');
  profileSettings.innerText = 'Profiili';

  const logoutBtn = document.createElement('p');
  logoutBtn.id = "logout-btn";
  logoutBtn.classList.add('dropdown-item');
  logoutBtn.innerText = 'Kirjaudu ulos';

  dropdownContent.appendChild(profileSettings);
  dropdownContent.appendChild(logoutBtn);

  userTarget.appendChild(avatarTarget);
  userTarget.appendChild(usernameText);
  userTarget.appendChild(dropdownArrow);
  userTarget.appendChild(dropdownContent);

  if (profUsername) profUsername.innerText = user.username;
  if (profEmail) profEmail.innerText = user.email;

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

  const settingsModal = document.querySelector('#profile') as HTMLDialogElement | null;

  profileSettings?.addEventListener('click', () => {
    settingsModal?.showModal();
  });

  logoutBtn?.addEventListener('click', () => {
    console.log('Logout button clicked');
    deleteUserDataFromDOM();
    localStorage.clear();
    checkToken();
    location.reload();
  });

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
  const faveTarget = document.querySelector('#prof-fave-target');
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
    faveStar.classList.add('fave-star');
    starCont.appendChild(faveStar);
    tr.appendChild(distTd);
    tr.appendChild(starCont);
    table.appendChild(tr);

    let starClicked = false;

    faveStar.addEventListener('mouseover', () => {
      faveStar.src = './img/hover-star.png';
    });

    faveStar.addEventListener('click', (e) => {
      e.stopPropagation();
      starClicked = true;
      if (!loggedIn) {
        alert('Kirjaudu sisään suosikkien tallentamiseksi!');
        faveStar.src = './img/empty-star.png'
        return;
      } else {
        document.querySelectorAll('.star-cont').forEach((starCont) => {
          const star = starCont.querySelector('.fave-star') as HTMLImageElement;
          star.src = './img/empty-star.png';
        })
        faveStar.src = './img/fave-star.png';
        document.querySelectorAll('.favorite').forEach((fave) => {
          fave.classList.remove('favorite');
        })
        tr.classList.add('favorite');
        if (faveTarget) {
          const faveName = faveTarget.querySelector('#fave-name') as HTMLSpanElement | null;
          if (faveName) faveName.innerText = restaurant.name;
        }
      };
    });

    faveStar.addEventListener('mouseout', () => {
      if (!starClicked) faveStar.src = './img/empty-star.png';
    });


    tr.addEventListener('click', async () => {
      try {
        const allHighs = document.querySelectorAll('.highlight');
        allHighs.forEach((high) => {
          high.classList.remove('highlight');
        });

        tr.classList.add('highlight');

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
          modal.insertAdjacentHTML('beforeend', '<span class="close">X</span><p style="margin-top:3rem;">Valitse ensin ruokalista!</p>');
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
    const restaurants = await fetchData<Restaurant[]>(apiUrl + '/restaurants');
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

    let darkTheme = false;
    const toggleTheme = document.querySelector('#light-dark') as HTMLImageElement | null;
    if (!toggleTheme) throw new Error('Theme toggle button not found!');

    toggleTheme?.addEventListener('mouseover', () => {
      if (!darkTheme) {
      toggleTheme.src = './img/dark-btn-hover.png';
      toggleTheme.title = 'Vaihda tummaan teemaan';
      } else {
        toggleTheme.src = './img/lite-btn-hover.png';
        toggleTheme.title = 'Vaihda kirkkaaseen teemaan';
      }
    });

    toggleTheme?.addEventListener('mouseout', () => {
      if (!darkTheme) {
        toggleTheme.src = './img/dark-btn.png';
      } else {
        toggleTheme.src = './img/lite-btn.png';
      }
    });

    toggleTheme?.addEventListener('click', () => {
      const body = document.body;
      if (!darkTheme) {
        body.classList.replace('light-mode', 'dark-mode');
        darkTheme = true;
        toggleTheme.src = './img/lite-btn.png';
      } else {
        body.classList.replace('dark-mode', 'light-mode');
        darkTheme = false;
        toggleTheme.src = './img/dark-btn.png';
      }
    })

    // RAVINTOLAHAKU & SUODATTIMET
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

    // KIRJAUTUMINEN
    const loginDialog = <HTMLDialogElement>document.querySelector("#login-screen");
    const openLoginBtn = document.querySelector('#nav-login');
    const closeLoginBtn = loginDialog.querySelector('.close');

    const loginForm = document.querySelector('#login-form');
    const usernameInput = document.querySelector('#username') as HTMLInputElement | null;
    const passwordInput = document.querySelector('#password') as HTMLInputElement | null;


    if (!loginDialog) throw new Error('No login dialog found!');

    openLoginBtn?.addEventListener("click", () => loginDialog.showModal());
    closeLoginBtn?.addEventListener('click', () => loginDialog.close());


    loginForm?.addEventListener('submit', async (evt) => {
      console.log('Login form submission started');
      evt.preventDefault();
      if (!usernameInput || !passwordInput) return;

      try {
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
      loginDialog.close();
      checkToken();
      } catch (e) {
        if ((e as Response).status === 401) alert('Käyttäjätiliä ei ole olemassa. Ole hyvä ja yritä uudelleen');
      }
    });


    // REKISTERÖITYMINEN
    const registerDialog = <HTMLDialogElement>document.querySelector('#register-screen');
    const openRegisterBtn = document.querySelector('#nav-register');
    const closeRegisterBtn = registerDialog.querySelector('.close');

    const registerForm = document.querySelector('#register-form');
    const registUsername = document.querySelector('#regist-username') as HTMLInputElement | null;
    const registEmail = document.querySelector('#regist-email') as HTMLInputElement | null;
    const regPswd = document.querySelector('#regist-password') as HTMLInputElement | null;
    const regPswd2 = document.querySelector('#regist-password2') as HTMLInputElement | null;

    if (!registerDialog) throw new Error('No register dialog found!');

    openRegisterBtn?.addEventListener('click', () => registerDialog.showModal());
    closeRegisterBtn?.addEventListener('click', () => registerDialog.close());

    registerForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!registUsername || !registEmail || !regPswd || !regPswd2) return;

      if (regPswd.value != regPswd2.value) {
        alert('Salasanat eivät täsmää!');
        return;
      };

      const user = {
        username: registUsername.value,
        password: regPswd.value,
        email: registEmail.value
      }

      const registerData = await register(user);
      const activationPopup = document.querySelector('#activate') as HTMLDialogElement | null;

      if (registerData.message === "user created") {
        registerDialog.close();
        activationPopup?.insertAdjacentHTML('beforeend', '<p>Tili luotu onnistuneesti! Kirjataan sisään...</p>');
        activationPopup?.showModal();

        const loginUser = {
          username: registUsername.value,
          password: regPswd.value
        }

        console.log('Logging in...');
        const userData = await login(loginUser);
        console.log(userData);
        loggedIn = true;

        localStorage.setItem('token', userData.token);
        addUserDataToDom(userData.data);
        console.log('User data added to DOM!');
        activationPopup?.close();
        checkToken();
      } else {
        throw new Error('Tapahtui virhe käyttäjätilin luomisessa. Ole hyvä ja yritä uudelleen');
      };


    })

    // KÄYTTÄJÄN PROFIILISIVU
    const profileDialog = document.querySelector('#profile') as HTMLDialogElement;
    const closeProfileDialog = profileDialog.querySelector('.close');

    closeProfileDialog?.addEventListener('click', () => {
      profileDialog.close();
    })
    const profileForm = document.querySelector('#profile-form');
    const avatarForm = document.querySelector('#avatar-form');

    const profileUsernameInput = document.querySelector('#profile-username') as HTMLInputElement | null;
    const profileEmailInput = document.querySelector('#profile-email') as HTMLInputElement | null;

    const avatarInput = document.querySelector('#avatar') as HTMLInputElement | null;

    profileForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (
        !profileUsernameInput ||
        !profileEmailInput
        ) {
        return;
      }
      const user: UpdateUser = {
        username: profileUsernameInput.value,
        email: profileEmailInput.value,
      };

      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }

      const updateUser = await updateUserData(user, token);
      console.log(updateUser);
      const updatedData = await getUserData(token);
      addUserDataToDom(updatedData)

    });

    avatarForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!avatarInput?.files) {
        return;
      }
      const image = avatarInput.files[0];

      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }

      const avatarData = await uploadAvatar(image, token);
      console.log(avatarData);
      checkToken();
    });

  } catch (error) {
    modal.innerHTML = errorModal((error as Error).message);
    modal.showModal();
  }
};


if (confirm('Annatko sivulle luvan käyttää sijaintitietojasi?')) navigator.geolocation.getCurrentPosition(success, error, positionOptions);
