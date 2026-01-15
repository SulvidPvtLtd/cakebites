# Create a new Expo project

Run a single command.

 `npx create-expo-app@latest FoodOrdering -t`

For the template, let’s choose “Navigation (TypeScript)”.

Open up a terminal, and let’s run the development server with npm start

# Setup the folder structure
It’s recommended to store all the source code of the applications in a separate folder called `src`in the root folder.

- app → src/app
- components → src/components
- constants → src/constants

Open the files e.g `src/app/_layout.tsx` and update the path of the relative import to reflect the new location:

From `require('../assets/fonts/SpaceMono-Regular.ttf')` 
to 
`require('../../assets/fonts/SpaceMono-Regular.ttf')`.

Commit your changes:

1. Check the status of changed files:

`git status`

2. Add all the changed files to the staging area

`git add .`

3. Commit all changes from the staging area

`git commit -m "init expo project"`

4. To save the current uncommited changes and reset to the previous working commit.

`git stash push -m "work in progress"`

Temporarily save uncommitted code	`git stash`
Delete last commit	`git reset --hard HEAD~1`
Revert pushed submission	`git reset --hard <hash> && git push --force`
Undo commit safely	`git revert HEAD`


# Predefined types

Create a file in the `src` file for `types.ts` and define types.

These types will make the components type-safe and mak sure who ever is using it will send a valid product object.

# Craete Typescript Path Aliases

With typescript path aliases, we can define path shortcuts to some folders that we often import from, and then our import statements will look much cleaner.

For that, we have to enable this experiment inside `app.json`

{
  "expo": {
    "experiments": {
      "tsconfigPaths": true
    }
  }
}

And define our path aliases inside tsconfig.json

{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@assets/*": ["assets/*"]
    }
  }
}

Now, we can use this aliases when importing files and assets. 

`import products from '../../../assets/data/products';`

`import products from '@assets/data/products';`

# FlatLIST

A FlatList is a React Native component that helps us render Vertical and Horizontal Scrollable Lists of data. 
Usually, designed for infinite scrollable lists, such as the Instagram feed. 

We will use a FlatList to render the list of products on our home screen.

It’s quite easy to render a simple list, because it has only 2 required properties

<FlatList
  data={products}
  renderItem={({ item }) => <ProductListItem product={item} />}
/>

- data: an array of items. In our cases, it’s an array of products
- renderItem: a function that will render 1 item from the array.

# Create screens using Expo Router

Create a new page for the details screen.

`app/product.tsx` -> We ca link to this page when we press on a `ProductListItem`


Card
 ├─ Image
 └─ TextContainer
     ├─ Title
     ├─ Price
     └─ Go to details

When you press the Product with a Pressable event from the `ProductListItem`, 

const ProductListItem = ({ product }: ProductListItemProps) => {
  return (
    <Link href={'/product'} asChild>
      <Pressable style={styles.container}>
				....

how do you know which product we are directing ourselves to on the  `app/product.tsx`.

You can convert the file `product.tsx` into a dynamic file by renaming it to `app/[id].tsx`

When linking to it, send the product id as part of the link

<Link href={`/${product.id}`} asChild>

Read the path parameter inside the Product details screen using

const { id } = useLocalSearchParams();


# Nested Stack Navigator

We want the product details page to be displayed under the Menu tab. 
That means that the menu tab will consist of multiple screen: 
1. The list of products and 
2. product details. 

Let’s group them in a separate folder `app/(tabs)/menu`with 2 screens (`index.tsx` and `[id].tsx`) and a `_layout.tsx`.

The layout can simply export the `<Stack />` component, to use a Stack navigator for the child routes.

- `src/app/(tabs)/_layout.tsx`
import { Stack } from 'expo-router';

export default function MenuLayout() {
  return <Stack />;
};


- By doing that, our `(tabs)/index.tsx` should simply redirect to the menu page.

import { Redirect } from 'expo-router';

export default function TabIndex () {
  return <Redirect href={'/menu/'} />;
};


Now, configure the `(tabs)/_layout.tsx` and hide the index route, rename the other routes and change the icons.

How do you do that?
- In the `app//(tabs)/_layout.tsx`, 

// Disable the "index" tab by setting href to null
<Tabs.Screen name="index" options={{ href: null}}/>


When we click on a product item, we get directed to "This screen doesn't exist".

So we need to go to our compenent "ProductListItem" , when we navigate to our product, the new path is no longer:

 `<Link href={`/${product.id}`} asChild>` 
 
 but should now be pointing to the menu folder fisrt as 
 
 `<Link href={`/menu/${product.id}`} asChild>`


Hidding Two page Headers on the Menu page's stack navigator.

- Menu and Index.
One is coming from the `(tabs)/_layout.tsx` and the other coming form ``(tabs)/menu/_layout.tsx`. 

So we will hide the header of the same file path `(tabs)/_layout.tsx` where we set the redirect to null previously.

How do we do that?

- In the Stack navigation's Tabs.Screen, set its option to `headerShown: false`,


# Setting Options to our screens

Expo Router uses file-based routing, and screen configuration is done with:

1. Stack.Screen
2. Tabs.Screen
3. useNavigation / useRouter
4. screenOptions

In our case our default is 
<Tabs screenOptions={}>

  <Tabs.Screen  name="index" options={ { title:'Home'} } />

</Tabs>.

You can override options per screen:

<Stack.Screen
  name="details"
  options={{
    title: 'Product Details',
    headerShown: true,
    presentation: 'modal',
  }}
/>

In this project we will move from a self closing Stack in our menu layout file:

export default function MenuStack(){
    return <Stack/>;
}

to 

export default function MenuStack(){
    return <Stack></Stack>;
}

- In-between the stack, we want to have Stack.Screens.

export default function MenuStack(){
    return 
        (<Stack>
            <Stack.Screen />
        </Stack>
    );
}

NB: behind the scenes expoRouter is using the react navigation, this means we can use all the configurations that we can find in Recat Navigation under Configuring the Header Bar.

https://reactnavigation.org/docs/headers?config=dynamic

The name you should assigne to the Stack.Secreen should match exactly the name given to the screen/page/file eg index for index.tsx.

So we want the default Header of the target `index.tsx` file which is name="index" to appear optionally, titled: "Menu"

We can apply 

export default function MenuStack(){
    return (
        <Stack>
            <Stack.Screen  name="index" options={{ title:'Menu'}} />
        </Stack>
    );
}

The above is one way of doing it.
Another way is to go directly to the page that is displaying our components ProductDetailsScreen in our project 
`app/(tabs)/menu/[id].tsx`
, in this case [id].tsx and return a view that use the same <Stack.Screen />, 

From 

  return (
    <View>
      <Text style={{ color: 'orange', fontSize:20 }}> Product Details Screen for id: {id}</Text>
    </View>
  )

  to 

  return (
    <View>
      <Stack.Screen options={{ title: "Details" }}>
      <Text style={{ color: 'orange', fontSize:20 }}> Product Details Screen for id: {id}</Text>
    </View>
  )

# Product Details Screen

 Implementation

- Start by rendering the Image, price and title
- Render the size selector component

State

- State allows us to keep track of data that changes inside the component. In this case, we will use as state variable to keep track of the selected size. We can use it’s value to highlight the selected size.

# Button component

Let’s create a reusable button component inside `components/Button.tsx`

First change the header in [id].tsx from title asigned value `"Details: " + id` to `product?.name`

<Stack.Screen options={{ title: "Details: " + id }}/>

to 

<Stack.Screen options={{ title: product?.name }}/>



# Shopping Cart

We will implement a Shopping Cart system using React Context which help us to o share data across components.

Start by create a new Screen app/cart.tsx based on the existing modal i the menu _layout.tsx.

From 
===========================================
export default function MenuStack(){
    return (
        <Stack>
            <Stack.Screen  name="index" options={{ title:'Menu'}}/>
        </Stack>
    );
}

To 
============================================
export default function MenuStack(){
    return (
        <Stack screenOptions={{
            headerRight: () => (
                        <Link href="/modal" asChild>
                          <Pressable>
                            {({ pressed }) => (
                              <FontAwesome
                                name="info-circle"
                                size={25}
                                color={Colors.light.tint}
                                style={{ marginRight: 15, opacity: pressed ? 0.5 : 1 }}
                              />
                            )}
                          </Pressable>
                        </Link>
                      ),
        }}>
            <Stack.Screen  name="index" options={{ title:'Menu'}}/>
        </Stack>
    );
}



You may delete the modal file after you are done copying it and configuring the cart.

#  Context provider

The data about the items in the cart will be needed in the multiple parts of the applications. For example, we will add items to the cart from the Product Details page, and will display them on the Cart screen. That is already something that cannot easily be accomplished with simple `useState`.

We will use a React Context, that will keep track of the cart data on a global level, and other components will be able to access the same data.

Steps:

- Define a simple Context provider
- Add the items state, and also implement the add to cart functionality
- Call the add to cart function from Product Details
- Consume the cart items array on Cart Screen
- Render the total items in the cart near the shopping cart icon


1. Create a context:
===================

import { createContext, useContext } from "react";


export const CartContext = createContext({});

// Provide details of the context value and methods to manipulate the cart
const CartProvider = ({children}) => {
    return (
        // The provider need values we will send to the context.consumer or useContext.
        <CartContext.Provider value={{ items: [], onAddItem: () => {}, onRemoveItem: () => {} }}>
            {/* whatever is in this provider -the children- would be able to consume the values set in value={{items: [], onAddItem: () => {} }}  */}
            {children}
        </CartContext.Provider>
    );
}

export default CartProvider;

explanation
=============================

- Convert this explanation into diagrams.

  `How createContext() Works`

Think of it as a global box:

┌───────────────────────────┐
│       CartContext         │
│                           │
│  items: []                │
│  onAddItem()              │
│  onRemoveItem()           │
└───────────────────────────┘

At this point:
- The box exists
- But it’s empty until a Provider fills it

What CartContext.Provider Does ?

<CartContext.Provider value={{ items, onAddItem, onRemoveItem }}>
  {children}
</CartContext.Provider>

Diagram:

┌───────────────────────────────────────┐
│ CartContext.Provider                  │
│                                       │
│   value = {                           │
│     items: [1,2,3,4],                 │
│     onAddItem(),                      │
│     onRemoveItem()                    │
│   }                                   │
│                                       │
│  ┌─────────── children ────────────┐  │
│  │ MenuScreen                      │  │
│  │ ProductDetails                  │  │
│  │ CartScreen                      │  │
│  └─────────────────────────────────┘  │
└───────────────────────────────────────┘

- Everything inside now shares the same cart.

If a component is:
- inside it can access cart
- outside it cannot access cart


<CartProvider>
   ├── MenuScreen
   ├── ProductDetails
   └── CartScreen
</CartProvider>


# Admin side implementation

1st change dynamic folder from (tabs) to (user) and correspondingly change its stack navigation name from tabs to user under the _layout.

<CartProvider>    
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="cart" options={{ presentation: 'modal' }} />
    </Stack>
</CartProvider>

to 

<CartProvider>    
  <Stack>
    <Stack.Screen name="(user)" options={{ headerShown: false }} />
    <Stack.Screen name="cart" options={{ presentation: 'modal' }} />
  </Stack>
</CartProvider>

