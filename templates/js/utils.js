"use strict";

function formatNumber(value){

    return Number(value).toLocaleString();

}

function formatDuration(milliseconds){

    const totalSeconds = Math.round(milliseconds / 1000);

    const hours = Math.floor(totalSeconds / 3600);

    const minutes = Math.floor((totalSeconds % 3600) / 60);

    const seconds = totalSeconds % 60;

    if (hours > 0){

        return `${hours}h ${minutes}m ${seconds}s`;

    }

    if (minutes > 0){

        return `${minutes}m ${seconds}s`;

    }

    return `${seconds}s`;

}