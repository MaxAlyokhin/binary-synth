<script setup>
import { useSettingsStore } from '@/stores/global.js'

const settings = useSettingsStore()
</script>

<template>
    <div class="global module">
        <span class="global-span">Global</span>

        <div class="global__wrapper">
            <div class="global__container">
                <span class="filter-freq key">Reading speed (s)</span>
                <input v-model="settings.readingSpeed" step="0.01" type="number" min="0" name="gain" />
            </div>

            <div class="global__container">
                <span>Transition type</span>
                <select name="transition" class="transition" v-model="settings.transitionType">
                    <option value="immediately">immediately</option>
                    <option value="linear">linear</option>
                    <option value="exponential">exponential</option>
                </select>
            </div>
        </div>

        <div class="module__container module__container--block">
            <span>Bitness</span>
            <div class="module__container module__container--radio">
                <div class="radio-element">
                    <input type="radio" name="bitness" id="bitness8" value="8" checked v-model="settings.bitness" />
                    <label for="bitness8">8-bit</label>
                </div>
                <div class="radio-element">
                    <input type="radio" name="bitness" id="bitness16" value="16" v-model="settings.bitness" />
                    <label for="bitness16">16-bit</label>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.global {
    grid-column: 1/-1;

    &-span {
        text-align: center;
        display: block;
        margin-bottom: 5px;
    }

    span {
        display: block;
        text-align: center;
        margin-bottom: 5px;
    }

    &__wrapper {
        display: flex;
        justify-content: space-between;
        gap: 10px;
    }

    &__container {
        display: flex;
        flex-direction: column;
        align-items: center;
    }
}
</style>
