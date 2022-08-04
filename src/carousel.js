import React, {
  useImperativeHandle,
  useRef,
  useState,
  forwardRef
} from 'react';
import { StyleSheet, Dimensions, FlatList, View } from 'react-native';
import Reanimated, { useSharedValue, useAnimatedStyle, interpolate, Extrapolate } from 'react-native-reanimated';

const { width: windowWidth } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {},
  itemContainer: { justifyContent: 'center' }
});

const ReanimatedFlatList = Reanimated.createAnimatedComponent(FlatList);
const ReanimatedView = Reanimated.createAnimatedComponent(View);

function Item(props) {
  const {
    scroll,
    startPoint,
    midPoint,
    endPoint,
    inActiveScale,
    itemContainerStyle,
    itemWidth,
    itemMarginStyle
  } = props;

  const xOffset = useSharedValue(1);

  xOffset.value = interpolate(
    scroll,
    [startPoint, midPoint, endPoint],
    [inActiveScale, 1, inActiveScale],
    Extrapolate.CLAMP
  );

  const reanimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{
        scale: xOffset.value
      }],
      opacity: xOffset.value
    };
  });

  return (
    <ReanimatedView
      pointerEvents={'box-none'}
      style={[
        styles.itemContainer,
        itemContainerStyle,
        { width: itemWidth },
        itemMarginStyle,
        reanimatedStyle
      ]}
    >
      {props.children}
    </ReanimatedView>
  );
}

function Carousel(props, ref) {
  const {
    data = [],
    style = {},
    containerWidth = windowWidth,
    itemWidth = 0.9 * windowWidth,
    itemContainerStyle = {},
    separatorWidth = 10,
    minScrollDistance = 5,
    inActiveScale = 0.8,
    inActiveOpacity = 0.8,
    inverted = false,
    initialIndex = 0,
    bounces = true,
    showsHorizontalScrollIndicator = false,
    keyExtractor = (item, index) => index.toString(),
    renderItem = () => {},
    onScrollEnd = () => {},
    onScrollBeginDrag = () => {},
    onScrollEndDrag = () => {},
    ...otherProps
  } = props;
  const scrollViewRef = useRef(null);
  const currentIndexRef = useRef(initialIndex);
  const scrollXRef = useRef(0);
  const scrollXBeginRef = useRef(0);
  const halfContainerWidth = containerWidth / 2;
  const halfItemWidth = itemWidth / 2;
  const itemTotalMarginBothSide = getItemTotalMarginBothSide();
  const containerStyle = [styles.container, { width: containerWidth }, style];
  const dataLength = data ? data.length : 0;

  const [scroll, setScroll] = useState(0)

  useImperativeHandle(ref, () => ({
    scrollToIndex: scrollToIndex
  }));

  function isLastItem(index) {
    return index === dataLength - 1;
  }

  function isFirstItem(index) {
    return index === 0;
  }

  function getItemLayout(data, index) {
    return {
      offset: getItemOffset(index),
      length: itemWidth,
      index
    };
  }

  function scrollToIndex(index) {
    if (index < 0 || index >= dataLength) {
      return;
    }
    onScrollEnd && onScrollEnd(data[index], index);
    currentIndexRef.current = index;
    setTimeout(() => {
      scrollViewRef.current &&
      scrollViewRef.current.scrollToOffset({
        offset: getItemOffset(index),
        animated: true
      });
    });
  }

  function handleOnScrollBeginDrag() {
    onScrollBeginDrag && onScrollBeginDrag();
    scrollXBeginRef.current = scrollXRef.current;
  }

  function handleOnScrollEndDrag() {
    onScrollEndDrag && onScrollEndDrag();
    if (scrollXRef.current < 0) {
      return;
    }
    const scrollDistance = scrollXRef.current - scrollXBeginRef.current;
    scrollXBeginRef.current = 0;
    if (Math.abs(scrollDistance) < minScrollDistance) {
      scrollToIndex(currentIndexRef.current);
      return;
    }
    if (scrollDistance < 0) {
      scrollToIndex(currentIndexRef.current - 1);
    } else {
      scrollToIndex(currentIndexRef.current + 1);
    }
  }

  function getItemTotalMarginBothSide() {
    const compensatorOfSeparatorByScaleEffect = (1 - inActiveScale) * itemWidth;
    return separatorWidth - compensatorOfSeparatorByScaleEffect / 2;
  }

  function getItemOffset(index) {
    return (
      index * (itemWidth + itemTotalMarginBothSide) -
      (halfContainerWidth - halfItemWidth)
    );
  }

  function getAnimatedOffset(index) {
    if (isFirstItem(index)) {
      return halfItemWidth;
    }
    if (isLastItem(index)) {
      return containerWidth - halfItemWidth;
    }
    return halfContainerWidth;
  }

  function getMidPontInterpolate(index, animatedOffset) {
    return (
      index * (itemWidth + itemTotalMarginBothSide) +
      halfItemWidth -
      animatedOffset
    );
  }
  function getStartPontInterpolate(index, midPoint) {
    if (index === 1) {
      return 0;
    }
    if (isLastItem(index)) {
      return (
        (dataLength - 2) * (itemWidth + itemTotalMarginBothSide) +
        halfItemWidth -
        halfContainerWidth
      );
    }
    return midPoint - itemWidth - itemTotalMarginBothSide;
  }

  function getEndPointInterpolate(index, midPoint) {
    if (isFirstItem(index)) {
      return (
        itemWidth + itemTotalMarginBothSide + halfItemWidth - halfContainerWidth
      );
    }
    if (index === dataLength - 2) {
      return (
        (dataLength - 1) * (itemWidth + itemTotalMarginBothSide) +
        itemWidth -
        containerWidth
      );
    }
    return midPoint + itemWidth + itemTotalMarginBothSide;
  }

  function getItemMarginStyle(index) {
    const marginSingleItemSide = itemTotalMarginBothSide / 2;
    if (isFirstItem(index)) {
      return !!inverted
        ? { marginLeft: marginSingleItemSide / 2 }
        : { marginRight: marginSingleItemSide / 2 };
    }
    if (isLastItem(index)) {
      return !!inverted
        ? { marginRight: marginSingleItemSide / 2 }
        : { marginLeft: marginSingleItemSide / 2 };
    }
    return { marginHorizontal: marginSingleItemSide };
  }

  function renderItemContainer({ item, index }) {
    const animatedOffset = getAnimatedOffset(index);
    const midPoint = getMidPontInterpolate(index, animatedOffset);
    const startPoint = getStartPontInterpolate(index, midPoint);
    const endPoint = getEndPointInterpolate(index, midPoint);
    const itemMarginStyle = getItemMarginStyle(index);

    return (
      <Item
        scroll={scroll}
        startPoint={startPoint}
        midPoint={midPoint}
        endPoint={endPoint}
        inActiveScale={inActiveScale}
        itemContainerStyle={itemContainerStyle}
        itemWidth={itemWidth}
        itemMarginStyle={itemMarginStyle}
      >
        {renderItem({ item, index })}
      </Item>
    );
  }

  return (
    <ReanimatedView>
      <ReanimatedFlatList
        {...otherProps}
        ref={scrollViewRef}
        data={data}
        style={containerStyle}
        horizontal={true}
        inverted={inverted}
        bounces={bounces}
        pagingEnabled
        initialScrollIndex={initialIndex}
        automaticallyAdjustContentInsets={false}
        showsHorizontalScrollIndicator={showsHorizontalScrollIndicator}
        onScroll={(event) => {
          setScroll(event.nativeEvent.contentOffset.x);
          scrollXRef.current = event.nativeEvent.contentOffset.x
        }}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        renderItem={renderItemContainer}
        onScrollBeginDrag={handleOnScrollBeginDrag}
        onScrollEndDrag={handleOnScrollEndDrag}
      />
    </ReanimatedView>
  );
}

export default forwardRef(Carousel);
