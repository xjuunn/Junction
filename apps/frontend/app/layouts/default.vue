<template>
    <div class="h-screen w-screen flex flex-col">
        <main-window-nav></main-window-nav>
        <div class="flex-1 overflow-hidden">
            <slot></slot>
        </div>
    </div>
</template>