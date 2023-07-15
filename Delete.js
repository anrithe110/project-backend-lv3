module.exports = async function Deletefile(deleting_Item_ID, fs, Product) {
  try {
    const item = await Product.findOne({ _id: deleting_Item_ID });
    for (let i = 0; i < Math.min(item.image.length, 6); i++) {
      if (item) {
        const filePath = "public/images/" + item.image[i];
        if (fs.existsSync(filePath)) {
          await Product.deleteOne({ _id: deleting_Item_ID });
          fs.unlinkSync(filePath);
          console.log("File deleted successfully");
        } else {
          console.log("File not found");
        }
      }
    }
  } catch (err) {
    console.log(err);
  }
};
