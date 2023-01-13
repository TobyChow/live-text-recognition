/* eslint-disable prettier/prettier */
import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Image, ScrollView } from 'react-native';

/**
 * https://en.wikipedia.org/api/rest_v1/#/Page%20content/get_page_summary__title_
 */
type WikiResult = {
    thumbnail?: {
        source: string,
        width: number,
        height: number
    }
    extract: string // short summary of query
}

export default function TextDisplay({ query } : {query:string}) {
    const [wikiResult, setWikiResult] = useState<WikiResult | null>();

    useEffect(() => {
        let ignore = false;
        const getWikiData = async () => {
            const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${query}?redirect=true`;
            const response = await fetch(url);
            const result = await response.json();
            if (!ignore) {
                setWikiResult(result);
            }
        };

        getWikiData();

        return () => {
            ignore = true;
        };
    },[query]);

    return (
        <View style={styles.mainContainer}>
            <View style={styles.imageContainer}>
            <Image
                style={styles.image}
                source={{
                uri: wikiResult?.thumbnail?.source,
                }}
                resizeMode={'contain'}
            />
            </View>
            <View style={styles.descriptionContainer}>
                <ScrollView>
                    <Text>{wikiResult?.extract}</Text>
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        flexDirection:'row',
    },
    image: {
        width:'100%',
        height:'100%',
    },
    imageContainer: {
        flex:1,
        marginRight: 10,
    },
    descriptionContainer: {
        flex:1,
    },
});
