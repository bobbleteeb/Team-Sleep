export type MenuItem = {
  id: number;
  name: string;
  price: number;
  image: string;
};

export type Restaurant = {
  id: number;
  name: string;
  cuisine: string;
  eta: string;
  deliveryFee: number;
  image: string;
  menu: MenuItem[];
};

export const restaurants: Restaurant[] = [
  {
    id: 1,
    name: "Urban Bites",
    cuisine: "American",
    eta: "20-30 min",
    deliveryFee: 2.49,
    image:
      "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=900&q=80",
    menu: [
      {
        id: 101,
        name: "Classic Cheeseburger",
        price: 10.99,
        image:
          "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80",
      },
      {
        id: 102,
        name: "Loaded Fries",
        price: 6.5,
        image:
          "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=900&q=80",
      },
    ],
  },
  {
    id: 2,
    name: "Sakura Roll House",
    cuisine: "Japanese",
    eta: "25-35 min",
    deliveryFee: 3.49,
    image:
      "https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&w=900&q=80",
    menu: [
      {
        id: 201,
        name: "Salmon Avocado Roll",
        price: 12.25,
        image:
          "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=900&q=80",
      },
      {
        id: 202,
        name: "Spicy Tuna Bowl",
        price: 13.75,
        image:
          "https://images.unsplash.com/photo-1607301405390-4f85d3b9b8f3?auto=format&fit=crop&w=900&q=80",
      },
    ],
  },
  {
    id: 3,
    name: "Green Curry Spot",
    cuisine: "Thai",
    eta: "30-40 min",
    deliveryFee: 2.99,
    image:
      "https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=900&q=80",
    menu: [
      {
        id: 301,
        name: "Chicken Pad Thai",
        price: 11.95,
        image:
          "https://images.unsplash.com/photo-1559314809-0f31657def5e?auto=format&fit=crop&w=900&q=80",
      },
      {
        id: 302,
        name: "Thai Basil Fried Rice",
        price: 10.5,
        image:
          "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=80",
      },
    ],
  },
];
