Group members: Trenton Fleming, Zain Lateef, John Nyren, and Vishnu Sriram.

The “Visual” screenshot shows how our project functions. There are four “Halls” or locations, with a respective beacon and board in each hall. Pushing a button on the board increments the counter for the corresponding hall. Entering the hall with an Android phone also increments the counter by detecting the beacon for the corresponding hall. When the counter reaches the threshold (in our example, 4) the Canvas displays a message for that hall and the board in that hall turns red.

There is one Android Studio project. To test beacon sensing, several things must be changed in AndroidMonitoringService.java. The beacon’s namespace and instance id must be input: the desired topic, “Little”, “Matherly”, “Carson”, or “Norman” hall must be specified: and the Broker in which you’d like to connect must be specified in the form “tcp://192.168.0.11:1883” if it isn’t the LAN Mosca broker. 

There are four mbed Code files. Each file represents a board in its respective hall. The only things that must be configured in these files is the board MAC address. See the “mbed Config Block” screenshot for details. 

There is one server.js file and one index.pug file. The only thing that must be configured is the server.js file. The beacon number and board number of each respective “Hall” must be inputted. See the “Server Config Block” screenshot for details. 

WHAT DID NOT WORK
-There is no decrementing of the counter, although this is not specified in the project description
-The threshold value is hardcoded in the server.js and index.pug file.
We couldn’t have the server pass the threshold value to .pug file.
