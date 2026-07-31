import { supabase, isSupabaseConfigured } from "./supabase-client.js";
import { appConfig } from "./config.js";
import { categorySeed, planSeed, productSeed, demoNotifications } from "./demo-data.js";
import { slugify } from "./ui.js";

export const state={user:null,profile:null,ready:false,configured:isSupabaseConfigured};
const K={user:"dhiexpress-demo-user",products:"dhiexpress-demo-products",cart:"dhiexpress-cart",wishlist:"dhiexpress-wishlist",recent:"dhiexpress-recently-viewed",orders:"dhiexpress-demo-orders",notifications:"dhiexpress-demo-notifications"};
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const now=()=>new Date().toISOString();
const uid=()=>state.user?.id||state.user?.uid;
const normalizeAuthUser=(user)=>{
  if(!user)return null;
  return {
    ...user,
    uid:user.id,
    displayName:user.user_metadata?.display_name||user.user_metadata?.full_name||user.email?.split("@")[0]||"Account",
    photoURL:user.user_metadata?.avatar_url||""
  };
};
const table=n=>appConfig.tables[n]||n;
const assertUser=()=>{if(!state.user)throw new Error("Please sign in.")};
const check=(error)=>{if(error)throw error};
const camel=s=>s.replace(/_([a-z])/g,(_,c)=>c.toUpperCase());
const normalize=(row)=>{if(!row)return null;const out={};for(const [k,v] of Object.entries(row))out[camel(k)]=v;return out};
const dbRow=(obj)=>{const map={displayName:"display_name",photoURL:"photo_url",sellerStatus:"seller_status",planId:"plan_id",businessName:"business_name",emailVerified:"email_verified",ownerId:"owner_id",sortOrder:"sort_order",listingLimit:"listing_limit",feePercent:"fee_percent",featuredLimit:"featured_limit",sellerId:"seller_id",sellerName:"seller_name",sellerPlan:"seller_plan",categoryId:"category_id",discountPrice:"discount_price",imageFileIds:"image_file_ids",buyerId:"buyer_id",buyerName:"buyer_name",buyerEmail:"buyer_email",sellerIds:"seller_ids",deliveryFee:"delivery_fee",paymentMethod:"payment_method",paymentStatus:"payment_status",shippingAddress:"shipping_address",orderNumber:"order_number",productId:"product_id",userId:"user_id",userName:"user_name",targetUrl:"target_url",participantIds:"participant_ids",participantNames:"participant_names",lastMessage:"last_message",conversationId:"conversation_id",orderId:"order_id",createdAt:"created_at",updatedAt:"updated_at",createdBy:"created_by"};const out={};for(const [k,v] of Object.entries(obj||{})){if(v!==undefined)out[map[k]||k]=v}return out};
async function one(name,id){const {data,error}=await supabase.from(table(name)).select("*").eq("id",id).maybeSingle();check(error);return normalize(data)}
async function many(name,build){let q=supabase.from(table(name)).select("*");q=build?build(q):q;const {data,error}=await q;check(error);return (data||[]).map(normalize)}

async function loadProfile(user){const {data,error}=await supabase.from(table("users")).select("*").eq("id",user.id).maybeSingle();check(error);if(data)return normalize(data);const fallback={id:user.id,display_name:user.user_metadata?.display_name||user.user_metadata?.full_name||user.email?.split("@")[0]||"DhiExpress User",email:user.email||"",photo_url:user.user_metadata?.avatar_url||"",role:"user",seller_status:"not_applied",status:"active",email_verified:!!user.email_confirmed_at,created_at:now(),updated_at:now()};const r=await supabase.from(table("users")).upsert(fallback).select().single();check(r.error);return normalize(r.data)}
async function hydrateLists(){if(!state.user)return;const {data}=await supabase.from(table("userLists")).select("type,items").eq("user_id",uid());for(const r of data||[]){if(r.type==="cart")write(K.cart,r.items||[]);if(r.type==="wishlist")write(K.wishlist,r.items||[]);if(r.type==="recent")write(K.recent,r.items||[])}}
async function syncList(type,items){if(!isSupabaseConfigured||!state.user)return;await supabase.from(table("userLists")).upsert({user_id:uid(),type,items,updated_at:now()},{onConflict:"user_id,type"})}

export async function initializeSession(cb){
  if(!isSupabaseConfigured){
    const p=read(K.user,null);
    state.user=p?{id:p.uid,uid:p.uid,email:p.email,displayName:p.displayName,user_metadata:{display_name:p.displayName}}:null;
    state.profile=p;
    state.ready=true;
    cb?.(state);
    return()=>{};
  }

  const {data:{session},error}=await supabase.auth.getSession();
  check(error);
  state.user=normalizeAuthUser(session?.user||null);
  state.profile=state.user?await loadProfile(state.user):null;
  if(state.user)await hydrateLists();
  state.ready=true;
  cb?.(state);

  const {data:{subscription}}=supabase.auth.onAuthStateChange(async(_event,nextSession)=>{
    try{
      state.user=normalizeAuthUser(nextSession?.user||null);
      state.profile=state.user?await loadProfile(state.user):null;
      if(state.user)await hydrateLists();
      cb?.(state);
    }catch(error){
      console.error("Session refresh failed:",error);
    }
  });

  return()=>subscription.unsubscribe();
}
export async function signUpEmail({displayName,email,password}){if(!isSupabaseConfigured)return demoSignIn("user",displayName,email);const {data,error}=await supabase.auth.signUp({email,password,options:{data:{display_name:displayName},emailRedirectTo:`${location.origin}/verify-email.html`}});check(error);return data.user}
export async function signInEmail(email,password){if(!isSupabaseConfigured)return demoSignIn(email.toLowerCase().includes("admin")?"admin":"user",email.split("@")[0],email);const {data,error}=await supabase.auth.signInWithPassword({email,password});check(error);return data.user}
export async function signInGoogle(){if(!isSupabaseConfigured)return demoSignIn("user","Google Demo User","demo@dhiexpress.mv");const {error}=await supabase.auth.signInWithOAuth({provider:"google",options:{redirectTo:`${location.origin}/dashboard.html`}});check(error)}
export async function resetPassword(email){if(!isSupabaseConfigured)return true;const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:`${location.origin}/reset-password.html`});check(error);return true}
export async function resendVerification(){if(!isSupabaseConfigured||!state.user)return;const {error}=await supabase.auth.resend({type:"signup",email:state.user.email,options:{emailRedirectTo:`${location.origin}/verify-email.html`}});check(error)}
export async function logout(){if(!isSupabaseConfigured)localStorage.removeItem(K.user);else check((await supabase.auth.signOut()).error);state.user=null;state.profile=null}
export function demoSignIn(role="user",displayName="Demo User",email="demo@dhiexpress.mv"){const d={uid:`demo-${role}`,email,displayName,role,isAdmin:role==="admin",sellerStatus:["seller","admin"].includes(role)?"approved":"not_applied",planId:role==="seller"?"gold":"",status:"active",emailVerified:true};write(K.user,d);state.user=d;state.profile=d;return d}
export async function updateMyProfile(data){assertUser();const clean={displayName:data.displayName||state.profile?.displayName||"User",phone:data.phone||"",island:data.island||"",atoll:data.atoll||"",address:data.address||"",updatedAt:now()};if(!isSupabaseConfigured){state.profile={...state.profile,...clean};write(K.user,state.profile);return state.profile}const {data:r,error}=await supabase.from(table("users")).update(dbRow(clean)).eq("id",uid()).select().single();check(error);await supabase.auth.updateUser({data:{display_name:clean.displayName}});state.profile=normalize(r);return state.profile}
export async function applyForSeller(data){assertUser();const app={user_id:uid(),business_name:data.businessName,owner_name:state.profile?.displayName||"",phone:data.phone||"",email:state.user.email||"",location:data.location||"Maldives",description:data.description||"",status:"pending",submitted_at:now(),updated_at:now()};if(!isSupabaseConfigured){state.profile={...state.profile,role:"seller",sellerStatus:"approved",businessName:data.businessName,planId:"bronze"};write(K.user,state.profile);return state.profile}check((await supabase.from(table("sellerApplications")).upsert(app,{onConflict:"user_id"})).error);const {data:r,error}=await supabase.from(table("users")).update({seller_status:"pending",business_name:data.businessName,phone:data.phone||"",location:data.location||"Maldives",description:data.description||"",updated_at:now()}).eq("id",uid()).select().single();check(error);state.profile=normalize(r);return state.profile}
export async function getCategories(activeOnly=true){if(!isSupabaseConfigured)return categorySeed.filter(x=>!activeOnly||x.active);return many("categories",q=>{q=q.order("sort_order");return activeOnly?q.eq("active",true):q})}
export async function getPlans(activeOnly=true){if(!isSupabaseConfigured)return planSeed.filter(x=>!activeOnly||x.active);return many("membershipPlans",q=>{q=q.order("price");return activeOnly?q.eq("active",true):q})}
function demos(){return[...read(K.products,[]),...productSeed].filter(x=>!read("dhiexpress-demo-deleted-products",[]).includes(x.id))}
export async function getProducts(f={}){let a=isSupabaseConfigured?await many("products",q=>q.eq("status","approved").order("featured",{ascending:false}).order("created_at",{ascending:false}).limit(120)):demos();const s=(f.search||"").toLowerCase(),seller=(f.seller||"").toLowerCase();return a.filter(p=>(!s||`${p.name} ${p.description} ${p.sellerName} ${p.location}`.toLowerCase().includes(s))&&(!seller||String(p.sellerName||"").toLowerCase().includes(seller))&&(!f.categoryId||p.categoryId===f.categoryId)&&(!f.condition||String(p.condition).toLowerCase()===String(f.condition).toLowerCase())&&(!f.sellerPlan||p.sellerPlan===f.sellerPlan)&&(!(f.minPrice!==undefined&&f.minPrice!=="")||Number(p.discountPrice||p.price)>=Number(f.minPrice))&&(!(f.maxPrice!==undefined&&f.maxPrice!=="")||Number(p.discountPrice||p.price)<=Number(f.maxPrice)))}
export async function getProduct(id){return isSupabaseConfigured?one("products",id):demos().find(x=>x.id===id)||null}
export async function getSeller(id){if(!id)return null;if(isSupabaseConfigured){const {data,error}=await supabase.from(table("sellerProfiles")).select("*").eq("owner_id",id).maybeSingle();check(error);return normalize(data)}const p=demos().find(x=>x.sellerId===id);return p?{id,displayName:p.sellerName,businessName:p.sellerName,sellerStatus:"approved",planId:p.sellerPlan,rating:p.sellerRating,description:"Trusted DhiExpress seller.",location:p.location}:null}
async function uploadImages(files=[]){const paths=[];for(const file of files){const ext=(file.name.split(".").pop()||"jpg").toLowerCase();const path=`${uid()}/${crypto.randomUUID()}.${ext}`;const {error}=await supabase.storage.from(appConfig.buckets.productImages).upload(path,file,{cacheControl:"3600",upsert:false});check(error);paths.push(path)}return paths}
const imageUrl=path=>supabase.storage.from(appConfig.buckets.productImages).getPublicUrl(path).data.publicUrl;
export async function createProduct(data,files=[]){assertUser();const id=crypto.randomUUID(),paths=isSupabaseConfigured?await uploadImages(files):[...files].map(URL.createObjectURL);const p={id,sellerId:uid(),sellerName:state.profile?.businessName||state.profile?.displayName||"Seller",sellerPlan:state.profile?.planId||"bronze",name:data.name,slug:slugify(data.name),description:data.description||"",categoryId:data.categoryId,price:Number(data.price),discountPrice:data.discountPrice?Number(data.discountPrice):null,stock:Number(data.stock||0),condition:data.condition||"new",delivery:data.delivery||"Contact seller",location:data.location||state.profile?.location||"Maldives",images:isSupabaseConfigured?paths.map(imageUrl):paths,imageFileIds:paths,featured:false,status:isAdmin()?"approved":"pending",createdAt:now(),updatedAt:now()};if(!isSupabaseConfigured){const a=read(K.products,[]);a.unshift({...p,status:"approved"});write(K.products,a);return id}const {error}=await supabase.from(table("products")).insert(dbRow(p));check(error);return id}
export async function updateProductRecord(id,data,files=[]){const cur=await getProduct(id);if(!cur)throw new Error("Product not found.");const paths=isSupabaseConfigured?await uploadImages(files):[...files].map(URL.createObjectURL);const upd={...data,price:Number(data.price),discountPrice:data.discountPrice?Number(data.discountPrice):null,stock:Number(data.stock||0),images:[...(data.existingImages||cur.images||[]),...(isSupabaseConfigured?paths.map(imageUrl):paths)].slice(0,8),imageFileIds:[...(cur.imageFileIds||[]),...paths].slice(0,8),updatedAt:now()};delete upd.existingImages;if(!isSupabaseConfigured){const a=read(K.products,[]),i=a.findIndex(x=>x.id===id);if(i>=0)a[i]={...a[i],...upd};else a.unshift({...cur,...upd});write(K.products,a);return}check((await supabase.from(table("products")).update(dbRow(upd)).eq("id",id)).error)}
export async function deleteProductRecord(id){if(!isSupabaseConfigured){write("dhiexpress-demo-deleted-products",[...new Set([...read("dhiexpress-demo-deleted-products",[]),id])]);return}check((await supabase.from(table("products")).delete().eq("id",id)).error)}
export async function getMyProducts(){assertUser();return isSupabaseConfigured?many("products",q=>q.eq("seller_id",uid()).order("created_at",{ascending:false})):demos().filter(x=>x.sellerId===uid()||String(x.id).startsWith("product-"))}
export function getCart(){return read(K.cart,[])}
export async function addToCart(productId,quantity=1){const a=getCart(),x=a.find(i=>i.productId===productId);if(x)x.quantity+=Number(quantity);else a.push({productId,quantity:Number(quantity)});write(K.cart,a);await syncList("cart",a);document.dispatchEvent(new Event("dx-data-change"))}
export async function updateCart(productId,quantity){let a=getCart();if(Number(quantity)<=0)a=a.filter(x=>x.productId!==productId);else{const x=a.find(i=>i.productId===productId);if(x)x.quantity=Number(quantity)}write(K.cart,a);await syncList("cart",a);document.dispatchEvent(new Event("dx-data-change"))}
export async function clearCart(){write(K.cart,[]);await syncList("cart",[]);document.dispatchEvent(new Event("dx-data-change"))}
export function getWishlist(){return read(K.wishlist,[])}
export async function toggleWishlist(productId){let a=getWishlist();a=a.includes(productId)?a.filter(x=>x!==productId):[...a,productId];write(K.wishlist,a);await syncList("wishlist",a);document.dispatchEvent(new Event("dx-data-change"));return a.includes(productId)}
export function getRecentlyViewed(){return read(K.recent,[])}
export async function recordRecentlyViewed(productId){const a=[productId,...getRecentlyViewed().filter(x=>x!==productId)].slice(0,12);write(K.recent,a);await syncList("recent",a)}
export async function createOrder(data){assertUser();const cart=getCart();if(!cart.length)throw new Error("Your cart is empty.");if(!isSupabaseConfigured){const products=await Promise.all(cart.map(x=>getProduct(x.productId)));const items=cart.map((x,i)=>({productId:x.productId,quantity:x.quantity,name:products[i]?.name||"Product",price:Number(products[i]?.discountPrice||products[i]?.price||0),sellerId:products[i]?.sellerId}));const subtotal=items.reduce((s,x)=>s+x.price*x.quantity,0),id=`order-${Date.now()}`,o={id,orderNumber:`DHI-${Date.now()}`,buyerId:uid(),buyerName:state.profile?.displayName||"Customer",buyerEmail:state.user.email,items,subtotal,deliveryFee:Number(data.deliveryFee||0),total:subtotal+Number(data.deliveryFee||0),currency:"MVR",status:"pending",paymentMethod:data.paymentMethod,paymentStatus:"pending",shippingAddress:data.shippingAddress,phone:data.phone,notes:data.notes||"",createdAt:now(),updatedAt:now()};const a=read(K.orders,[]);a.unshift(o);write(K.orders,a);await clearCart();return id}const {data:r,error}=await supabase.rpc("create_marketplace_order",{p_cart:cart,p_shipping_address:data.shippingAddress,p_phone:data.phone,p_notes:data.notes||"",p_payment_method:data.paymentMethod||"cash_on_delivery",p_delivery_fee:Number(data.deliveryFee||0),p_bank_reference:data.bankReference||""});check(error);await clearCart();return r}
export async function getOrders(scope="buyer"){
  assertUser();
  if(!isSupabaseConfigured){
    const rows=read(K.orders,[]);
    return scope==="seller"?rows.filter(order=>(order.items||[]).some(item=>item.sellerId===uid())):rows;
  }

  const orders=await many("orders",q=>{
    const filtered=scope==="seller"?q.contains("seller_ids",[uid()]):q.eq("buyer_id",uid());
    return filtered.order("created_at",{ascending:false});
  });

  if(scope==="seller"){
    for(const order of orders){
      order.items=await many("orderItems",q=>q.eq("order_id",order.id).eq("seller_id",uid()));
    }
  }
  return orders;
}
export async function getOrder(id){const o=isSupabaseConfigured?await one("orders",id):read(K.orders,[]).find(x=>x.id===id);if(isSupabaseConfigured&&o){const items=await many("orderItems",q=>q.eq("order_id",id));o.items=items}return o}
export async function updateOrderStatus(id,status){if(!isSupabaseConfigured){const a=read(K.orders,[]),o=a.find(x=>x.id===id);if(o)o.status=status;write(K.orders,a);return}check((await supabase.from(table("orders")).update({status,updated_at:now()}).eq("id",id)).error)}
export async function addReview({productId,rating,comment}){assertUser();const r={productId,userId:uid(),userName:state.profile?.displayName||"Customer",rating:Number(rating),comment,status:"approved",createdAt:now()};if(!isSupabaseConfigured){const a=read(`reviews-${productId}`,[]);a.unshift({id:`r-${Date.now()}`,...r});write(`reviews-${productId}`,a);return}check((await supabase.from(table("reviews")).insert(dbRow({...r,id:crypto.randomUUID()}))).error)}
export async function getReviews(productId){return isSupabaseConfigured?many("reviews",q=>q.eq("product_id",productId).eq("status","approved").order("created_at",{ascending:false})):read(`reviews-${productId}`,[])}
export async function getNotifications(){if(!state.user)return[];return isSupabaseConfigured?many("notifications",q=>q.eq("user_id",uid()).order("created_at",{ascending:false})):read(K.notifications,demoNotifications)}
export async function markNotificationRead(id){if(!isSupabaseConfigured){const a=read(K.notifications,demoNotifications),x=a.find(n=>n.id===id);if(x)x.read=true;write(K.notifications,a);return}check((await supabase.from(table("notifications")).update({read:true}).eq("id",id)).error)}
export async function getConversations(){assertUser();return isSupabaseConfigured?many("conversations",q=>q.contains("participant_ids",[uid()]).order("updated_at",{ascending:false})):read("dhiexpress-demo-conversations",[])}
export async function createOrGetConversation(otherUserId,otherName,productId=null){assertUser();const all=await getConversations(),old=all.find(c=>c.participantIds?.includes(otherUserId)&&(!productId||c.productId===productId));if(old)return old.id;if(!isSupabaseConfigured){const id=`c-${Date.now()}`,a=read("dhiexpress-demo-conversations",[]);a.unshift({id,participantIds:[uid(),otherUserId],participantNames:[state.profile?.displayName||"You",otherName],productId,messages:[],lastMessage:"",updatedAt:now()});write("dhiexpress-demo-conversations",a);return id}const id=crypto.randomUUID();check((await supabase.from(table("conversations")).insert({id,participant_ids:[uid(),otherUserId],participant_names:[state.profile?.displayName||"You",otherName],product_id:productId,last_message:"",updated_at:now()})).error);return id}
export async function getMessages(conversationId){if(!isSupabaseConfigured)return read("dhiexpress-demo-conversations",[]).find(c=>c.id===conversationId)?.messages||[];return many("messages",q=>q.eq("conversation_id",conversationId).order("created_at"))}
export async function sendMessage(conversationId,text){assertUser();if(!isSupabaseConfigured){const a=read("dhiexpress-demo-conversations",[]),c=a.find(x=>x.id===conversationId);c.messages.push({id:`m-${Date.now()}`,senderId:uid(),text,createdAt:now()});c.lastMessage=text;c.updatedAt=now();write("dhiexpress-demo-conversations",a);return}check((await supabase.from(table("messages")).insert({id:crypto.randomUUID(),conversation_id:conversationId,sender_id:uid(),text,read:false,created_at:now()})).error);await supabase.from(table("conversations")).update({last_message:text,updated_at:now()}).eq("id",conversationId)}
export async function submitComplaint(data){assertUser();const c={id:crypto.randomUUID(),userId:uid(),userEmail:state.user.email,type:data.type,subject:data.subject,message:data.message,orderId:data.orderId||null,status:"open",createdAt:now()};if(!isSupabaseConfigured){const a=read("dhiexpress-demo-complaints",[]);a.unshift(c);write("dhiexpress-demo-complaints",a);return}check((await supabase.from(table("complaints")).insert(dbRow(c))).error)}
export async function changeMembership(planId){assertUser();if(!isSupabaseConfigured){state.profile={...state.profile,role:"seller",sellerStatus:"approved",planId};write(K.user,state.profile);return}check((await supabase.from(table("subscriptions")).insert({id:crypto.randomUUID(),user_id:uid(),plan_id:planId,status:"pending",starts_at:null,expires_at:null,auto_renew:false,created_at:now()})).error);return true}
export async function cancelMembership(){assertUser();if(!isSupabaseConfigured){state.profile.planId="";write(K.user,state.profile);return}check((await supabase.from(table("subscriptions")).update({status:"cancel_requested"}).eq("user_id",uid()).in("status",["active","pending"])).error);return true}
export function isAdmin(){return state.profile?.role==="admin"||state.profile?.isAdmin===true}
export function requireAuth(){if(!state.user){location.href=`login.html?next=${encodeURIComponent(location.pathname.split('/').pop()+location.search)}`;return false}return true}
export function requireAdmin(){if(!state.user){location.href="admin-login.html";return false}if(!isAdmin()){location.href="dashboard.html?denied=admin";return false}return true}
export async function adminList(name,max=200){if(!isSupabaseConfigured){const map={users:[state.profile].filter(Boolean),products:demos(),orders:read(K.orders,[]),reviews:[],complaints:read("dhiexpress-demo-complaints",[]),payments:[],subscriptions:[],announcements:read("dhiexpress-demo-announcements",[]),categories:categorySeed,membershipPlans:planSeed,clientErrors:[]};return map[name]||[]}return many(name,q=>q.order("created_at",{ascending:false}).limit(max))}
export async function adminUpdate(name,id,data){if(!isSupabaseConfigured)return;check((await supabase.from(table(name)).update(dbRow({...data,updatedAt:now()})).eq("id",id)).error)}
export async function adminDelete(name,id){if(!isSupabaseConfigured)return;check((await supabase.from(table(name)).delete().eq("id",id)).error)}
export async function adminSaveCategory(c){const id=c.id||slugify(c.name),data={id,name:c.name,icon:c.icon||"fa-tag",active:c.active!==false,sort_order:Number(c.sortOrder||0)};if(!isSupabaseConfigured)return id;check((await supabase.from(table("categories")).upsert(data)).error);return id}
export async function adminSavePlan(p){const id=p.id||slugify(p.name),data={id,name:p.name,price:Number(p.price),listing_limit:Number(p.listingLimit),fee_percent:Number(p.feePercent||0),featured_limit:Number(p.featuredLimit||0),badge:p.badge||p.name,benefits:p.benefits||[],active:p.active!==false};if(!isSupabaseConfigured)return id;check((await supabase.from(table("membershipPlans")).upsert(data)).error);return id}
export async function adminSaveSettings(s){if(!isSupabaseConfigured){write("dhiexpress-demo-settings",s);return}check((await supabase.from(table("settings")).upsert({id:"public",value:s,public:true,updated_by:uid(),updated_at:now()})).error)}
export async function getPublicSettings(){if(!isSupabaseConfigured)return read("dhiexpress-demo-settings",{cashOnDelivery:true,bankTransfer:true,bankName:"",bankAccountName:"",bankAccountNumber:"",onlinePayment:appConfig.onlinePaymentEnabled,maintenanceMode:false});const r=await one("settings","public");return r?.value||{}}
export async function reportClientError(error){console.error(error);if(!isSupabaseConfigured||!state.user)return;try{await supabase.from(table("clientErrors")).insert({id:crypto.randomUUID(),user_id:uid(),message:String(error?.message||error),page:location.href,created_at:now()})}catch{}}
export async function adminSendAnnouncement(title,message){if(!isSupabaseConfigured){const a=read("dhiexpress-demo-announcements",[]);a.unshift({id:`a-${Date.now()}`,title,message,active:true,createdAt:now()});write("dhiexpress-demo-announcements",a);return}check((await supabase.from(table("announcements")).insert({id:crypto.randomUUID(),title,message,audience:"all",active:true,created_by:uid(),created_at:now()})).error)}
export async function adminDeleteUserAccount(){throw new Error("Deleting Auth users requires the optional Supabase Edge Function. See docs/EDGE_FUNCTIONS.md.")}
export async function seedDatabase(){if(!isSupabaseConfigured)return;for(const c of categorySeed)await adminSaveCategory(c);for(const p of planSeed)await adminSavePlan(p);return true}
export async function callOnlinePayment(){throw new Error("Online payment is not configured.")}
