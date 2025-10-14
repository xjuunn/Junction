<template>
    <div class="h-screen w-screen flex flex-col">
        <main-window-nav></main-window-nav>
        <div class="flex flex-1">
            <main-window-menubar></main-window-menubar>
            <div class="w-full">
                <slot></slot>
            </div>
        </div>
    </div>
</template>