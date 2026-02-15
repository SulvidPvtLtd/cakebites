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

Temporarily save uncommitted code `git stash`
Delete last commit `git reset --hard HEAD~1`
Revert pushed submission `git reset --hard <hash> && git push --force`
Undo commit safely `git revert HEAD`

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
"@/_": ["src/_"],
"@components/_": ["src/components/_"],
"@assets/_": ["assets/_"]
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

how do you know which product we are directing ourselves to on the `app/product.tsx`.

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

<Tabs.Screen name="index" options={ { title:'Home'} } />

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
<Stack.Screen name="index" options={{ title:'Menu'}} />
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

Start by create a new Screen app/cart.tsx based on the existing modal i the menu \_layout.tsx.

# From

export default function MenuStack(){
return (
<Stack>
<Stack.Screen name="index" options={{ title:'Menu'}}/>
</Stack>
);
}

# To

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
<Stack.Screen name="index" options={{ title:'Menu'}}/>
</Stack>
);
}

You may delete the modal file after you are done copying it and configuring the cart.

# Context provider

The data about the items in the cart will be needed in the multiple parts of the applications. For example, we will add items to the cart from the Product Details page, and will display them on the Cart screen. That is already something that cannot easily be accomplished with simple `useState`.

We will use a React Context, that will keep track of the cart data on a global level, and other components will be able to access the same data.

Steps:

- Define a simple Context provider
- Add the items state, and also implement the add to cart functionality
- Call the add to cart function from Product Details
- Consume the cart items array on Cart Screen
- Render the total items in the cart near the shopping cart icon

1. # Create a context:

import { createContext, useContext } from "react";

export const CartContext = createContext({});

// Provide details of the context value and methods to manipulate the cart
const CartProvider = ({children}) => {
return (
// The provider need values we will send to the context.consumer or useContext.
<CartContext.Provider value={{ items: [], onAddItem: () => {}, onRemoveItem: () => {} }}>
{/_ whatever is in this provider -the children- would be able to consume the values set in value={{items: [], onAddItem: () => {} }} _/}
{children}
</CartContext.Provider>
);
}

export default CartProvider;

# explanation

- Convert this explanation into diagrams.

  `How createContext() Works`

Think of it as a global box:

┌───────────────────────────┐
│ CartContext │
│ │
│ items: [] │
│ onAddItem() │
│ onRemoveItem() │
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
│ CartContext.Provider │
│ │
│ value = { │
│ items: [1,2,3,4], │
│ onAddItem(), │
│ onRemoveItem() │
│ } │
│ │
│ ┌─────────── children ────────────┐ │
│ │ MenuScreen │ │
│ │ ProductDetails │ │
│ │ CartScreen │ │
│ └─────────────────────────────────┘ │
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

1st change dynamic folder from (tabs) to (user) and correspondingly change its stack navigation name from tabs to user under the \_layout.

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

# Create Product

We will make use of an expo library called expo image picker.

run the following command to install it:

`npx expo install expo-image-picker`

Make use of the following state variables:

`const [image, setImage] = useState<string | null>(null);`

And make use of the following image picker functions:

const pickImage = async () => {
// No permissions request is necessary for launching the image library.
// Manually request permissions for videos on iOS when `allowsEditing` is set to `false`
// and `videoExportPreset` is `'Passthrough'` (the default), ideally before launching the picker
// so the app users aren't surprised by a system dialog after picking a video.
// See "Invoke permissions for videos" sub section for more details.
const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permission required', 'Permission to access the media library is required.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    console.log(result);

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }

};

NB: Make sure to make call the function pickImage when you press on the 'Select Image' button on `create.tsx`.

`<Text onPress={pickImage} style={styles.textButton}>Select image</Text>`

make sure to change from default to the selected image:

`<Image source={{ uri: defaultPizzaImage }} style={styles.image} />`

to

`<Image source={{ uri: image ||defaultPizzaImage }} style={styles.image} />`

On the ImagePicker function, you can set mediaTypes to either both video and images or just images..

`mediaTypes: ['images', 'videos'],`

# link to Top Tab Navigation:

`https://reactnavigation.org/docs/material-top-tab-navigator?config=static`

# Getting Started with SupaBase

## Create an new project

1. [Create a new project](https://supabase.com/dashboard) in the Supabase Dashboard
2. Set up the database schema based on **The User Management Starter** Template from the SQL Editor
3. Get the API Keys from the API Settings page

# Configure Supabase in our project

1. Install dependencies

`npm install @supabase/supabase-js`
`npm install react-native-elements @react-native-async-storage/async-storage react-native-url-polyfill`
`npx expo install expo-secure-store`

2. Configure Supbase inside a new `src/lib/supabase.ts` file

import 'react-native-url-polyfill/auto';
import \* as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';

const ExpoSecureStoreAdapter = {
getItem: (key: string) => {
return SecureStore.getItemAsync(key);
},
setItem: (key: string, value: string) => {
SecureStore.setItemAsync(key, value);
},
removeItem: (key: string) => {
SecureStore.deleteItemAsync(key);
},
};

const supabaseUrl = 'YOUR_REACT_NATIVE_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_REACT_NATIVE_SUPABASE_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
auth: {
storage: ExpoSecureStoreAdapter as any,
autoRefreshToken: true,
persistSession: true,
detectSessionInUrl: false,
},
});

Get you anon key from Supabase

https://supabase.com/dashboard/project/YOUR PROJECT ID/asettings/api-keys

# Authentication

## Sign up

Let’s create a new account on the Sign up screen `app/(auth)/sign-up.tsx`

```tsx
const [loading, setLoading] = useState(false);

async function signUpWithEmail() {
  setLoading(true);
  const { error } = await supabase.auth.signUp({
    email: email,
    password: password,
  });

  if (error) Alert.alert(error.message);
  setLoading(false);
}
```

You can disable the required email verification step from:
supabase Dashboard → Authentication → Sign In / ProvidersProviders → Email → Confirm email

This can be a temporal measure when you want to test app without eamil authentication workflow.

- You can prevent multiple execution of the same request by using `loading` state variable and `setLoading` function. For example in our signup :

```tsx
async function signUpWithEmail() {
  setLoading(true); // sign up starts
  //console.warn('sign up with email');

  const signupResponse = await supabase.auth.signUp({ email, password });

  if (signupResponse.error) {
    Alert.alert("Error signing up", signupResponse.error.message);
  } else {
    Alert.alert(
      "Success",
      "Account created successfully! Please check your email to confirm your account.",
    );
  }

  setLoading(false); // sign up ends
}

// the Button component state is disbaled when loading starts and then reset when loading ends.

<Button
  onPress={signUpWithEmail}
  disabled={loading}
  text={loading ? "Creating account..." : "Create account"}
/>;
```

Once you manage to sign in.
The user will automatically have a session.
We will need to fetch this session to use it in the app.

`const { data: session } = useSession();`

# Authentication Provider

We have to store the information about the user session somewhere globally, because we will need it in different places in our app. We can use the `useSession` hook to get the session information.

1. Let’s Create the providers/AuthProvider.tsx

The Auth Provider takes care of session management globbally. It should export the user session, that we can get by calling the `useSession` hook.

`const { data: { session } } = await supabase.auth.getSession();`

2. We can also subscribe to session changes using

supabase.auth.onAuthStateChange((\_event, session) => {
setSession(session);
});

The Application layout should be wrapped with the AuthProvider component. This makes authentication state globally available to your entire app.

Global access to auth state

So any component can know:

Is the user logged in?

Who is the user?

What is their role?

Is auth still loading?

```tsx: src/app/_layout.tsx

<AuthProvider>
  <CartProvider>
          {/*Everthing in here is the Chidren of the CartProvider*/}
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />

            <Stack.Screen name="(admin)" options={{ headerShown: false }} />
            <Stack.Screen name="(user)" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="cart" options={{ presentation: "modal" }} />
          </Stack>
        </CartProvider>
</AuthProvider>

```

# Group based navigation

How can we navigate to different groups, based on the user group?

This can be achived by keeping track of Profile state

Besides keeping track of user sessions in the AuthProvider. We also need to keep track of the user profile.

First, let’s add a new column `group` in our `profiles` table on Supabase.

Now, inside the `AuthProvider` we can also keep track of the user profile

```tsx
if (session) {
  // fetch profile
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();
  setProfile(data || null);
}
```

I will make the code follow best enterprise practice version with:

cleanup subscription
✅ proper unsubscribe
✅ error handling
✅ loading race condition protection
✅ profile caching
✅ role guard helpers
✅ memoized context
✅ strict typing
✅ SSR-safe pattern
✅ auth refresh handling

# Mental Model of the AuthProvider:

App starts
↓
Check session
↓
If logged in → load profile
↓
Store everything globally
↓
Listen for login/logout changes
↓
Update everything automatically

# Product CRUD

Will need to setup the Products database table, and will query and mutate the data from our React Native app.

1. Create the Products table : Let’s start by creating the products table in the Supabse Dashboard.

- The product table will be based on the data we have in the `assets/data/products.ts` file or based on the data from the types.

Types:

export type Product = {
id: number;
image: string | null;
name: string;
price: number;
};

On supabase: Database -> Tables -> New Table -> products.
NB: Leave the Enable Row Level Security (RLS) option checked.

- Create a table called `products` with the following columns:

- id: int8
- created_at: timestamp
- image: text | null # This is nullable because some product may not have an image.
- name: text
- price: float4
- description: text | null

Now we have the table to query in table editor.

products-> insert -> insert row ->

- leave the id blank. this will be auto created.
-

The next step is to fetch the data from the table and display it in the app.

In Postgress, by default, no user is allowed to query anything unless the policy has been set to allow it.

To enable someone to do something, go to the table editor in supabase and add the policy.
These rules will depend on the level experience that you want for your users.

`Add policy for ALL operations under the policy "Allow authenticated users ALL operations"`
CREATE POLICY "Allow authenticated users ALL operations" ON "public.products" TO authenticated
AS PERMISSIVE FOR ALL
To authenticated
USING (true)
WITH CHECK (true);

Instead of manually fetching data our self,

useEffect(() => {
const fetchProducts = async () => {
// Simulate an API call to fetch products
const { data, error } = await supabase.from('products').select('\*');
console.log('Fetched products:', data);
};
fetchProducts();
}, []);

With this code above - The query should have failed initially, because the data is protected by Row Level Security policies on the PostgreSQL Database layer. By default, nobody has access to the table.

We have to specify rules to give specific users granular access to the data.

- [ ] Create a new policy to allow authenticated users READ operations on the products table

As you can see, we can easily query items in our components using supabase. But, there are still a lot of things that we have to manage ourself, such as loading states, error mesages, etc.

We can use the a react query known as TanStack Query. It is a powerful tool for fetching and mutating data in React asynchronously.

We will leverage the power of catching mechanism to keep the data in synch.
For example when creating a new product, you can refresh the product list.

[React Query](https://tanstack.com/query/latest) is a powerful state management and data fetching library that helps us query remote data. Besides helping us query data, manage the loading and error states, it also provides a caching mechanism for our local data. That will help us keep all the data in sync when things change in the application.

`npm i @tanstack/react-query`

Create the client provider src/providers/QueryProvider.tsx

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PropsWithChildren } from "react";

const client = new QueryClient();

export default function QueryProvider({ children }: PropsWithChildren) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
```

Wrap it around our app in app/\_layout.tsx

useQuery

const {data, isLoading, error } = useQuery<Product[]>({
queryKey: ['products'],
queryFn: async () => {
const { data, error } = await supabase.from('products').select('\*');
if (error) {
throw new Error(error.message);
}
return data;
},
});

Create a separate folder for all our React Query requests

The folder `api` will contain all helper functions for our React Query requests.

In api folder in fthe index.ts file, instead of destructuring the useQuery above, we can return the data directly.

```
return useQuery<Product[]>({
  queryKey: ['products'],
  queryFn: async () => {
    const { data, error } = await supabase.from('products').select('*');
    if (error) {
      throw new Error(error.message);
    }
    return data;
  },
});

```

and then import the useProductList hook in the MenuScreen component in the app/(user)/menu/index.tsx file.

```tsx
`const { data: products, error, isLoading } = useProductList();`;
```

Now we can use the data in our component.

4:31:39

We Read Product by id,

- To read a product by id, we will first create the `useProduct` hook inside `api/products/index.ts`
- Then, use this hook in both `app/(user)/menu/[id].tsx` and `app/(admin)/menu/[id].tsx`

# Create a product

Admins can also create products. We have the form, what’s left is to connect it with our supabase app and save the data in the database.

Let’s start by creating the useMutation inside `api/products/index.ts`

In [id].tsx: that screen was loading from local mock data (assets/data/products) while your admin list is loaded from Supabase, so selected items could resolve to the wrong product (like MeatZZa).

WhatWhat needs to be changed:

1. Switch admin detail lookup to Supabase hook:
   [id].tsx (line 58)
   now uses useProduct(productId ?? -1) instead of products.find(...).
2. Make route param parsing robust:
   [id].tsx (line 40)
   handles id as string or string[] before parsing.
3. Update edit link to use parsed numeric id:
   [id].tsx (line 124)
   changed to /(admin)/menu/create?id=${productId}.

At the moment our projcet or supabase doe not know what our product type is.
Its currently declared as any.

`src/api/products/index.ts`
export const useProductList = () => {
return const { data, error } = await supabase.from('products').select('\*');  
};

# Typescript

Supabase has great support for Typescript.
We can generate the types based on the Database and use them in our app.

1. Login

- run `npx supabase login`
- https://supabase.com/dashboard/account/tokens

2. Generate types type

- run `npx supabase gen types typescript --project-id your_project_id > src/database.types.ts`

- When ever you update your types in the database, go ahead and run the above command to update the types in the project as well.

3. Supply the types to our client in lib/supabse.ts

- import { Database } from '../database.types
- export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {

4. Define type helpers inside types.ts

```ts //Helper types
import { Database } from "./database.types";

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];
```

5. Use the Table types instead of our hand written ones. For example in our Componets/productLitsItem.tsx folder:

type ProductListItemProps = {
product: Tables<'products'>;
};

Replace them in our custom components and also inside the api folder.

At this stage replace all project defined types with supabase types.

