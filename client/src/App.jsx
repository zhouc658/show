import { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import "./App.css"

const BASE_URL = import.meta.env.BASE_URL;

//define my images array in their initial order
const initialImages = [
  { id: 1, url: `${BASE_URL}images/bunny.png`, title: "One" },
  { id: 2, url: "images/wolf.png", title: "Two" },
  { id: 3, url: "/images/sheep.png", title: "Three" },
  { id: 4, url: "/images/grass.png", title: "four" },
  { id: 5, url: "/images/carrot.png", title: "five" },
  { id: 6, url: "/images/catch.png", title: "six" },
];

//components
export default function GalleryFeedback() {
  //this is for the props on the side, images lets us read the state, seImages lets us change the state
  const [images, setImages] = useState(initialImages);

  // images on the stage, and start with empty array becuz there is nothing on the stage yet
  const [stageImages, setStageImages] = useState([]);

  //draggedId lets us read the id of whatever image is being dragged 
  //setDraggedId lets us change the id to be whatever image is being dragged
  const [draggedId, setDraggedId] = useState(null); //null becuz nothing is dragged yet
  const galleryRef = useRef(null);// Reference to gallery DOM element for downloading image
  const ws = useRef(null); //stores the ws connection

  //open up the connection and what we goiing to do when we get the connection 
  useEffect(() => {
    ws.current = new WebSocket("wss://show-dx8g.onrender.com"); //so this is connecting to the websocket server

    ws.current.onmessage = (msg) => {
      //convert JSON to object format when server sends a msg
      const data = JSON.parse(msg.data);

      if (data.type === 'move' || data.type === 'upload' || data.type === 'remove') {
        // Update stage and prop images if any client moves, uploads or deletes a props from the side or images on the stage
        setStageImages(data.stageImages);
        setImages(data.propImages);
      }
    };

    return () => ws.current.close(); //close ws when it is done
  }, []); //The [] makes the effect run only once just for setup

  //telling server that something changed on the client side so that the server can update all the clients, so the type are the changes like move from before
  const broadcast = (type, propImages, stageImages) => {
    //if the ws is connected then send this JSON msg to the server
    ws.current?.send(JSON.stringify({ type, propImages, stageImages }));
  };

  // Custom function to update the draggedId state variable with the dragged id
  // 'e' is the drag event, triggered when dragging starts
  const handleDragStart = (e, id) => setDraggedId(id);

  //allows me to drop the image inside the stage/GALLERY div container, e is the event when drag happens
  const handleDragOver = (e) => e.preventDefault();

  //function for when an image is dragged to the stage and then dropped(onDrop)
  const handleDrop = (e) => { //e is when the drop happens

    // if nothing is being dragged, do nothing
    if (!draggedId) return;

    //Findind the x and y position after drop into the stage/gallery container, then reset them to be center so minus 50 it not in corner, referenced Xiao's code
    const newX = e.nativeEvent.offsetX - 50;
    const newY = e.nativeEvent.offsetY - 50;

    //make a copy of our images in their current state
    let updatedStage = [...stageImages];

    //check if the image I dragded to the stage is already on the stage or not, so go through the stageImages array to find it, compare the id of the image and the img dragged
    const draggedOnStage = stageImages.find(i => i.id === draggedId.id);

    //if not already on the stage then we create a new stage image by including these
    //it treats each image separatly which is why we can have duplicate images on the stage
    if (!draggedOnStage) {
      const newStageImage = {
        url: draggedId.url, //the url of the img
        id: Date.now(), //give it a unique id
        x: newX, //the x position 
        y: newY, //the y position
      };
      //add the newStageImage to the existing stageImages array
      updatedStage = [...stageImages, newStageImage];

    } else {
      // if it is already on stage then just update its position
      updatedStage = stageImages.map(img =>
        //when id is equal then update position for the one draged and leave others as is
        img.id === draggedId.id ? { ...img, x: newX, y: newY } : img
      );
    }
    // Update the stageImages state with the new array
    setStageImages(updatedStage);

    //Send msg to the server and other clients so that they know what moved
    broadcast("move", images, updatedStage);
    //set dragged id back to null becuz nothing is being dragged anymore
    setDraggedId(null);
  };

  const handleUpload = (e) => { //the e is the event object that tells when the user uploaded files
    const files = Array.from(e.target.files);
    const newImages = files.map((file, id) => ({ //Loops through each uploaded file and creates a new object for it.
      id: Date.now() + id, //gives each image an id 
      url: URL.createObjectURL(file), //creates a temporary url that shows the uploaded image
      title: file.name, //store the name of the file
    }));
    //create a new array so that it adds the prop images already on the side with the newImages that was just uploaded
    const updatedProp = [...images, ...newImages];

    //updates the images state with the new array above, this is for updating ur own page to see the image that just uploaded
    setImages(updatedProp);

    //send msg to the server and other clients when something uploaded, the updatedProp and the stageImages
    broadcast("upload", updatedProp, stageImages);
  };

  //function for downloading the stage/gallery as an image
  const handleDownloadGalleryImage = async () => {
    if (!galleryRef.current) return;  //check if the galleryReft is there
    //html2canavs takes the picture
    const canvas = await html2canvas(galleryRef.current, { useCORS: true });
    //convert screenshot to a downloadable png img
    const dataURL = canvas.toDataURL("image/png");

    //goes to the download on the right top of ur page, and just click to download
    const link = document.createElement("a");
    link.href = dataURL;
    link.download = "gallery.png";
    link.click();
  };

  //use id so its more specific on which image u are deleting
  const removeImage = (imgToRemove) => {
    //compare by id, remove image that has matching id as imgToRemove.id, for stage and prop 
    const updatedProp = images.filter(img => img.id !== imgToRemove.id);
    const updatedStage = stageImages.filter(img => img.id !== imgToRemove.id);

    // Update the images and stateImages state so your own screen removes the image from the gallery
    setImages(updatedProp);
    setStageImages(updatedStage);

    //send msg to the server and other clients when something is removed, updatedProp and updatedStage
    broadcast("remove", updatedProp, updatedStage);
  };


  //this is where we put the actual componenets, the above were just defining it and now we are using it 
  return (
    <div className="container">
      <h2>Welcome to the Show</h2>
      <h4>Work together to create a scene or story by dragging the props from the left. You can also upload images of your own props to use. And then download to record each scene.</h4>

      <label className="upload-btn">
        <b>Upload More Props</b>
        <input
          type="file"
          multiple //allow user to upload more than one image at once
          onChange={handleUpload} // When files are uploaded, call handleUpload 
        />
      </label>

      <button
        className="download-btn"
        onClick={handleDownloadGalleryImage} //when clicked, call this function
      >
        Download Gallery as Image
      </button>

      {/* the container for the props on side */}
      <div className="prop">
        {images.map(img => (
          <div key={img.id} //giving it a unique key
            draggable  //tells it that its a draggable element
            // When dragging starts, call handleDragStart function and give in all the image info
            onDragStart={(e) => handleDragStart(e, img)}>
            <img
              src={img.url}
              alt={img.title}
            />
            <button //button to remove the img
              className="remove-btn"
              onClick={() => removeImage(img)}
            >
              x
            </button>
          </div>
        ))}

      </div>

      {/* STAGE  contianer*/}
      <div className="gallery"
        ref={galleryRef}  //ref for this so that you could capture the img with html2canvas
        onDrop={handleDrop} //call handleDrop when a dragged item is dropped onto stage
        onDragOver={handleDragOver} //call handleDragOver so that img can be dragged in this contianer
      >
        {stageImages.map((img) => ( //go thru the images on the stage rn
          <div
            key={img.id}
            className="gallery-item" //for style
            style={{ left: img.x, top: img.y }} //position the img at x and y coordinates
            draggable
            onDragStart={(e) => handleDragStart(e, img)}

          >
            <img src={img.url} alt={img.title} />

            <button
              className="remove-btn"
              onClick={() => removeImage(img)}
            >
              x
            </button>
          </div>
        ))}
      </div>

    </div>
  );
}
