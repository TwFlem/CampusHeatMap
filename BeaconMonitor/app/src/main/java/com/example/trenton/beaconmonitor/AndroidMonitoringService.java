package com.example.trenton.beaconmonitor;

import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.util.Log;
import com.estimote.sdk.BeaconManager;
import com.estimote.sdk.EstimoteSDK;
import com.estimote.sdk.SystemRequirementsChecker;
import com.estimote.sdk.eddystone.Eddystone;

import org.eclipse.paho.android.service.MqttAndroidClient;
import org.eclipse.paho.client.mqttv3.IMqttActionListener;
import org.eclipse.paho.client.mqttv3.IMqttToken;
import org.eclipse.paho.client.mqttv3.MqttClient;
import org.eclipse.paho.client.mqttv3.MqttException;
import org.eclipse.paho.client.mqttv3.MqttMessage;

import java.io.UnsupportedEncodingException;
import java.util.List;

public class AndroidMonitoringService extends AppCompatActivity {

    private BeaconManager beaconManager;
    private String scanId;
    private final String TAG = "My beacon: ";
    private String BeaconNamespace = "edd1ebeac04e5defa017";
    private boolean BeaconFound = false;
    private boolean AlreadyEntered = false;
    private MqttAndroidClient client;
    private String ClientID;
    //Each Beacon and topic corresponds to a building on campus.
    //Currently, only listens for one beacon per app instance.
    String topic = "little";
    String ServerUri = "tcp://192.168.0.11:1883";
    String InstanceID = "ecee698d84f0";



    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);



        setContentView(R.layout.activity_android_monitoring_service);

        //Allows use of Estimote's SDK. We're using Trenton's particular access key.
       EstimoteSDK.initialize(getApplicationContext(), "trenton-fleming-s-your-own-i9l", "be9707bd2c9c2f8943909f1b47a8fa38");
        beaconManager = new BeaconManager(getApplicationContext());

        //This allows the service to listen for eddystone packets every second.
        beaconManager.setEddystoneListener(new BeaconManager.EddystoneListener() {
            @Override public void onEddystonesFound(List<Eddystone> eddystones) {

                String uid = " ";

                //Wouldn't want to continuously try to suscribe to the same topic over and over.
                if (BeaconFound && !AlreadyEntered) {
                    do_Enter();
                    AlreadyEntered = true;
                }


                for (Eddystone e : eddystones) {
                    uid = e.namespace + e.instance;

                    if (uid.equals(BeaconNamespace + InstanceID)) {
                        BeaconFound = true;
                        break;
                    }

                    else if(!AlreadyEntered)
                        BeaconFound = false;
                }

                if((AlreadyEntered && (!BeaconFound || eddystones.size() == 0))) {
                    do_Exit();
                    BeaconFound = false;
                    AlreadyEntered = false;
                }
            }
        });

        //Starts scanning for eddystones
        beaconManager.connect(new BeaconManager.ServiceReadyCallback() {
            @Override public void onServiceReady() {
                scanId = beaconManager.startEddystoneScanning();
            }
        });

        // The Mqtt client that handles sending and recieving packets
        ClientID = MqttClient.generateClientId();
        client =
                new MqttAndroidClient(this.getApplicationContext(), ServerUri,
                        ClientID);

        try {
            IMqttToken token = client.connect();
            token.setActionCallback(new IMqttActionListener() {
                @Override
                public void onSuccess(IMqttToken asyncActionToken) {
                    // We are connected
                    Log.d(TAG, "onSuccess");
                }

                @Override
                public void onFailure(IMqttToken asyncActionToken, Throwable exception) {
                    // Something went wrong e.g. connection timeout or firewall problems
                    Log.d(TAG, "onFailure");

                }
            });
        } catch (MqttException e) {
            e.printStackTrace();
        }
    }

    protected void onResume() {
        super.onResume();

        // We need permissions to scan for eddystone
        SystemRequirementsChecker.checkWithDefaultDialogs(this);
        beaconManager.connect(new BeaconManager.ServiceReadyCallback() {
            @Override public void onServiceReady() {
                scanId = beaconManager.startEddystoneScanning();
            }
        });

    }

    protected void do_Enter(){

        Log.d(TAG, "User Entered");

        // Attempt to suscribe to the current building's topic
        int qos = 1;
        try {
            IMqttToken subToken = client.subscribe(topic, qos);
            subToken.setActionCallback(new IMqttActionListener() {
                @Override
                public void onSuccess(IMqttToken asyncActionToken) {
                   Log.d(TAG, "Subscribed");
                    String payload = InstanceID; //Send the instance id of a given beacon.
                    byte[] encodedPayload = new byte[0];
                    try {
                        encodedPayload = payload.getBytes("UTF-8");
                        MqttMessage message = new MqttMessage(encodedPayload);
                        client.publish(topic, message);
                    } catch (UnsupportedEncodingException | MqttException e) {
                        e.printStackTrace();
                    }
                }

                @Override
                public void onFailure(IMqttToken asyncActionToken,
                                      Throwable exception) {
                    Log.d(TAG, "Did not suscribe to topic");

                }
            });
        } catch (MqttException e) {
            e.printStackTrace();
        }

    }

    protected void do_Exit() {
        Log.d(TAG, "User exited");

        try {
            IMqttToken unsubToken = client.unsubscribe(topic);
            unsubToken.setActionCallback(new IMqttActionListener() {
                @Override
                public void onSuccess(IMqttToken asyncActionToken) {
                    Log.d(TAG, "Unsubscribed from topic");
                }

                @Override
                public void onFailure(IMqttToken asyncActionToken,
                                      Throwable exception) {
                   Log.d(TAG, "Did not unsubscribe");
                }
            });
        } catch (MqttException e) {
            e.printStackTrace();
        }

    }
}
