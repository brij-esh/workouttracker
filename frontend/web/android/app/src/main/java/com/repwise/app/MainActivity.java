package com.repwise.app;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import com.repwise.app.steps.RepwiseStepsPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(RepwiseStepsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
