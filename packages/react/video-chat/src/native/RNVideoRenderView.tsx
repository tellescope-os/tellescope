/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 */

import React from 'react';
import { requireNativeComponent, findNodeHandle, ViewStyle } from 'react-native';
import { NativeFunction } from './bridge';

export class RNVideoRenderView extends React.Component<{ tileId: number, style?: ViewStyle }> {
  componentDidMount() {
    // we need to delay the bind video 
    // Because "componentDidMount" will be called "immediately after the initial rendering occurs"
    // This is *before* RCTUIManager add this view to register (so that viewForReactTag() can return a view)
    // So we need to dispatch bindVideoView after this function complete
    setTimeout(() => {
      NativeFunction.bindVideoView(findNodeHandle(this), this.props.tileId);
    }, 1000); // use explicit 1s timeout to avoid crashes on self-video toggle
  }

  componentWillUnmount() {
    NativeFunction.unbindVideoView(this.props.tileId);
  }

  render() {
    return <RNVideoRenderViewNative {...this.props} />;
  }
}

// @ts-ignore 
const RNVideoRenderViewNative = requireNativeComponent('RNVideoView', RNVideoRenderView);