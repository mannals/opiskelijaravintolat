// interface for user based on the result of https://sodexo-webscrape-r73sdlmfxa-lz.a.run.app/#api-User-CheckToken

interface User {
  _id: string;
  username: string;
  favouriteRestaurant: string;
  avatar: string;
  role: string;
  email: string;
  activated?: boolean;
}

interface LoginUser {
  message: string;
  token: string;
  data: User;
}

interface RegisterUser {
  message: string;
  data: User;
  activationUrl: string;
}

interface UpdateUser {
  username?: string;
  password?: string;
  email?: string;
}

export type {User, LoginUser, RegisterUser, UpdateUser};
