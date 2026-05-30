import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema({
  stores: [{ type: mongoose.Schema.Types.ObjectId, ref: "Store" }]
});
const Product = mongoose.model("ProductTest", ProductSchema);

async function run() {
  const p = new Product({ stores: [] }); // Not assigned
  console.log("Empty stores array:");
  console.log("isArray?", Array.isArray(p.stores));
  console.log("some?", p.stores.some(id => String(id) === "6a190560ce453c2453c0c750"));

  const p2 = new Product({ stores: ["6a190560ce453c2453c0c750"] }); // Assigned
  console.log("\nStores array with correct ID:");
  console.log("isArray?", Array.isArray(p2.stores));
  console.log("some?", p2.stores.some(id => String(id) === "6a190560ce453c2453c0c750"));

  const p3 = new Product(); // Not initialized explicitly
  console.log("\nUninitialized stores array:");
  console.log("isArray?", Array.isArray(p3.stores));
  console.log("some?", p3.stores.some(id => String(id) === "6a190560ce453c2453c0c750"));
}

run();
