import { createContext, PropsWithChildren, useContext, useState } from "react";
import { CartItem, Product } from "../types";

type CartType = {
  items: CartItem[];
  addItem: (product: Product, size: CartItem['size']) => void;
  //removeItem: (product: Product, size: CartItem['size']) => void;
};

/**
 * Create a Context object.
 *
 * This Context will hold shared data (the cart)
 * and make it available to any component in the app
 * without passing props down manually.
 *
 * The empty object {} is the DEFAULT value.
 * (In real apps, this should be typed and not empty.)
 */
const CartContext = createContext<CartType>({
    items: [],
    addItem: () => {},      
    
});

/**
 * CartProvider is a wrapper component.
 *
 * Any component rendered inside this provider
 * will be able to ACCESS the cart data
 * using useContext(CartContext).
 */
const CartProvider = ({ children }: PropsWithChildren) => {
  
    const [items, setItems] = useState<CartItem[]>([]);
  
    const addItem = (product: Product, size: CartItem['size']) => {
        console.log('Adding item to cart:', product, size);
        // Implementation to add item to cart goes here
    }

    /*
    const removeItem = (product: Product, size: CartItem['size']) => {
        console.log('Removing item from cart:', product, size);
        // Implementation to remove item from cart goes here
    }*/

    return (
    /**
     * CartContext.Provider is the component that
     * actually PROVIDES data to the context.
     *
     * The `value` prop is the data that will be shared.
     */
    <CartContext.Provider
      value={{
        // Shared cart data
        items,

        // Function to add an item to the cart
        // (currently empty — just a placeholder)
        addItem,

        //removeItem,
      }}
    >
      {/*
        `children` represents ALL components wrapped
        inside <CartProvider> in the app.

        These components can now "consume" the cart
        using useCart() or useContext(CartContext).
      */}
      {children}
    </CartContext.Provider>
  );
};

export default CartProvider;

/**
 * Custom hook to access the CartContext.
 *
 * Instead of writing:
 *   useContext(CartContext)
 *
 * everywhere in the app, we use:
 *   useCart()
 *
 * This makes the code cleaner and easier to maintain.
 */
export const useCart = () => useContext(CartContext);
