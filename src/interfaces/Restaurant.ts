interface Restaurant {
    _id: string,
    name: string,
    location: {
        type: 'Point',
        coordinates: number[]
    }
    companyId: number,
    address: string,
    postalCode: string,
    city: string,
    phone: string,
    company: string,

}

export type {Restaurant}
