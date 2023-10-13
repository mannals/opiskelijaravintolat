import {dropdownOptions, errorModal, restaurantModal, restaurantRow} from './components';
import {fetchData} from './functions';
import {apiUrl, uploadUrl, positionOptions} from './variables';
import {Restaurant} from './interfaces/Restaurant';
import {WeeklyMenu, DailyMenu} from './interfaces/Menu';
import {LoginUser, User} from './interfaces/User';
import { registerSW } from 'virtual:pwa-register';

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
})

let dailySelected = false;
let weeklySelected = false;
let citySelected = 'Kaikki kaupungit';
let companySelected = 'Kaikki yritykset';

const selection = document.querySelector('select');
if (!selection) {
  throw new Error('Selection not found!');
}
dropdownOptions(selection);

const selectedCity = (sel: HTMLSelectElement) => {
  citySelected = sel.options[sel.selectedIndex].text;
  console.log(citySelected);
}

const modal = document.querySelector('dialog');
if (!modal) {
  throw new Error('Modal not found');
}
modal.addEventListener('click', () => {
  modal.close();
});

const calculateDistance = (x1: number, y1: number, x2: number, y2: number) =>
  Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

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
  dropdownContent.classList.add("visible");
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

  navRight.appendChild(userTarget);

};

const checkToken = async (): Promise<void> => {
  const token = localStorage.getItem('token');
  if (!token) {
    return;
  }

  const userData = await getUserData(token);
  addUserDataToDom(userData);
};

const createTable = (restaurants: Restaurant[]) => {
  const table = document.querySelector('table');
  if (!table) throw new Error('Table not found!');
  table.innerHTML = '';

  restaurants.forEach((restaurant, index) => {
    const tr = restaurantRow(restaurant);
    if (index === 0) tr.classList.add('nearest');
    const starCont = document.createElement('td');
    starCont.classList.add('star-cont');
    const faveStar = document.createElement('img');
    faveStar.src = './img/empty-star.png';
    faveStar.id = 'fave-star';
    starCont.appendChild(faveStar);
    tr.appendChild(starCont);
    table.appendChild(tr);

    faveStar.addEventListener('mouseover', () => {
      faveStar.src = './img/hover-star.png';
    });

    faveStar.addEventListener('mouseout', () => {
      faveStar.src = './img/empty-star.png';
    });

    faveStar.addEventListener('click', () => {
      faveStar.src = './img/fave-star.png';
      tr.classList.add('favorite');
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
        } else if (weeklySelected) {
          const menu = await fetchData<WeeklyMenu>(
            apiUrl + `/restaurants/weekly/${restaurant._id}/fi`
          );
          console.log(menu);

          const menuHtml = restaurantModal(restaurant, menu);
          modal.insertAdjacentHTML('beforeend', menuHtml);
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
    const restaurants = await fetchData<Restaurant[]>(apiUrl + '/restaurants');
    console.log(restaurants);
    restaurants.sort((a: Restaurant, b: Restaurant) => {
      const x1 = crd.latitude;
      const y1 = crd.longitude;
      const x2a = a.location.coordinates[1];
      const y2a = a.location.coordinates[0];
      const distanceA = calculateDistance(x1, y1, x2a, y2a);
      const x2b = b.location.coordinates[1];
      const y2b = b.location.coordinates[0];
      const distanceB = calculateDistance(x1, y1, x2b, y2b);
      return distanceA - distanceB;
    });
    // buttons for filtering
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
        createTable(restaurants)
      }
      if (citySelected === 'Kaikki kaupungit' && companySelected != 'Kaikki yritykset') {
        const filtered = restaurants.filter((restaurant: Restaurant) => restaurant.company === companySelected);
        createTable(filtered);
      }
      if (citySelected != 'Kaikki kaupungit' && companySelected === 'Kaikki yritykset') {
        const filtered = restaurants.filter((restaurant: Restaurant) => restaurant.city === citySelected);
        createTable(filtered);
      }
      if (citySelected != 'Kaikki kaupungit' && companySelected != 'Kaikki yritykset') {
        const filtered = restaurants.filter((restaurant: Restaurant) => restaurant.city === citySelected && restaurant.company === companySelected);
        if (!filtered) alert('Valitsemillasi suodattimilla ei löytynyt ravintoloita!');
        createTable(filtered);
      }
    });


    const loginDialog = <HTMLDialogElement>document.querySelector("#login-screen");
    const openDialogBtn = document.querySelector('#kirj-rekist');
    const formContainer = document.querySelector('.form-cont');

    const loginTab = <HTMLHeadingElement>document.querySelector('#login');
    const loginBtn = document.querySelector("#kirjaudu-btn");
    const loginForm = document.querySelector('#login-form');
    const usernameInput = document.querySelector('#username') as HTMLInputElement | null;
    const passwordInput = document.querySelector('#password') as HTMLInputElement | null;

    const registerTab = <HTMLElement>document.querySelector('#register');

    window.onclick = function(event) {
      if (event.target == loginDialog) {
        loginDialog.style.display = "none";
      }
    }


    if (!loginDialog || !formContainer) throw new Error('No login dialog found!')

    const openDialog = () => {
      loginDialog.showModal();
    };

    const closeDialog = (e: Event) => {
      e.preventDefault();
      loginDialog.close();
    };

    openDialogBtn?.addEventListener("click", openDialog);
    loginBtn?.addEventListener("click", closeDialog);


    registerTab?.addEventListener("click", () => {
      if (loginTab.classList.contains('open-tab')) {
      loginTab.classList.remove('open-tab');
      registerTab.classList.add('open-tab');
      formContainer.innerHTML = '';
      let html = `
      <form method="get" class="form-example">
      <div class="form-example">
        <label for="name">Käyttäjänimi: </label>
        <input type="text" name="name" id="name" minlength="3" required>
      </div>
      <div class="form-example">
        <label for="email">Sähköposti: </label>
        <input type="email" name="email" id="email" required>
      </div>
      <div class="form-example">
          <label for="password">Salasana: </label>
          <input type="password" name="password" id="password" pattern="(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}" title="Anna vähintään 8-merkkinen salasana, joka sisältää pieniä ja suuria kirjaimia sekä numeroita!" required>
      </div>
      <div class="form-example">
          <label for="password2">Salasana uudelleen: </label>
          <input type="password" name="password2" id="password2" pattern="(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}" title="Anna sama salasana uudelleen!" required>
      </div>
      <div class="regist-button">
        <input type="submit" value="Rekisteröidy" id="rekisteroidy">
      </div>
      </form>
      `;
      formContainer.insertAdjacentHTML('beforeend', html);
    };
    });


    loginTab?.addEventListener("click", () => {
      if (registerTab.classList.contains('open-tab')) {
        registerTab.classList.remove('open-tab');
        loginTab.classList.add('open-tab');
        formContainer.innerHTML = '';
        let html = `
        <form method="get" class="form-example" id="login-form">
        <div class="form-example">
          <label for="name">Käyttäjänimi: </label>
          <input type="text" name="name" id="name" minlength="3" required>
       </div>
        <div class="form-example">
            <label for="password">Salasana: </label>
            <input type="password" name="password" id="password" pattern="(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}" title="Anna vähintään 8-merkkinen salasana, joka sisältää pieniä ja suuria kirjaimia sekä numeroita!" required>
        </div>
        <div class="login-button">
          <input type="submit" value="Kirjaudu" id="kirjaudu">
        </div>
        </form>
        `;
        formContainer.insertAdjacentHTML('beforeend', html);
      };
    });

    const logoutBtn = document.querySelector('#logout-btn');
    const navRight = document.querySelector('#nav-right') as HTMLDivElement | null;


    logoutBtn?.addEventListener('click', () => {
      localStorage.clear();
      if (!navRight) throw new Error('Error logging out.');
      navRight.innerHTML = '';
      navRight.insertAdjacentHTML('beforeend', `<button id="kirj-rekist">Kirjaudu</button>`);
      location.reload();
    })

    checkToken();

    loginForm?.addEventListener('submit', async (evt) => {
      evt.preventDefault();
      if (!usernameInput || !passwordInput) {
        return;
      }
      const user = {
        username: usernameInput.value,
        password: passwordInput.value,
      };

      console.log('Logging in...');
      const loginData = await login(user);
      console.log(loginData);

      localStorage.setItem('token', loginData.token);
      addUserDataToDom(loginData.data);
      console.log('User data added to DOM!');
    });


  } catch (error) {
    modal.innerHTML = errorModal((error as Error).message);
    modal.showModal();
  }
};

navigator.geolocation.getCurrentPosition(success, error, positionOptions);
